import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

type User = {
  id: number;
  name?: string;
  email: string;
  isOnline?: boolean;
  lastSeen?: string | null;
};

type Message = {
  id: number;
  message: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
};

type AuthResponse = {
  accessToken: string;
  user: User;
};

type ComposerKeyEvent = {
  nativeEvent: {
    key?: string;
    shiftKey?: boolean;
    preventDefault?: () => void;
  };
};

function getDefaultApiUrl() {
  const location = globalThis.location;
  if (location?.hostname) {
    return `${location.protocol}//${location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

export default function App() {
  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('priyanshu@example.com');
  const [password, setPassword] = useState('secret123');
  const [showPassword, setShowPassword] = useState(false);
  const [peerEmail, setPeerEmail] = useState('rahul@example.com');
  const [peer, setPeer] = useState<User | null>(null);
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Login or register to start chatting');
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesListRef = useRef<FlatList<Message> | null>(null);
  const authRef = useRef<AuthResponse | null>(auth);
  const roomIdRef = useRef(roomId);

  const currentUser = auth?.user;
  const currentRoomId = Number(roomId);
  const peerName = peer?.name || peer?.email || 'Select a contact';
  const canSend = Boolean(auth && currentRoomId && messageText.trim());

  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    const timer = setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    if (!auth) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
      return;
    }

    const socket = io(apiUrl, {
      auth: { token: auth.accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      setStatus('Realtime connection active');
      if (Number(roomIdRef.current)) {
        socket.emit('join_room', { roomId: Number(roomIdRef.current) });
      }
    });
    socket.on('disconnect', () => {
      setIsSocketConnected(false);
      setStatus('Realtime connection disconnected');
    });
    socket.on('receive_message', (message: Message) => {
      setMessages((previous) =>
        previous.some((item) => item.id === message.id)
          ? previous
          : [...previous, message],
      );
      if (Number(roomIdRef.current)) {
        socket.emit('message_read', { roomId: Number(roomIdRef.current) });
      }
    });
    socket.on('typing_start', (event: { userId: number }) => {
      if (event.userId !== authRef.current?.user.id) {
        setTypingUser(event.userId);
      }
    });
    socket.on('typing_stop', () => setTypingUser(null));
    socket.on('message_status_updated', () => {
      setMessages((previous) =>
        previous.map((message) => ({ ...message, status: 'read' })),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [apiUrl, auth]);

  async function request<T>(
    path: string,
    options: RequestInit = {},
    token = authRef.current?.accessToken,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json() as Promise<T>;
  }

  async function submitAuth() {
    setIsLoading(true);
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        authMode === 'login'
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password };
      const result = await request<AuthResponse>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAuth(result);
      setPeer(null);
      setRoomId('');
      setMessages([]);
      setStatus(`Signed in as ${result.user.email}`);
      setShowProfilePanel(true);
    } catch (error) {
      setStatus(`${authMode} failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    socketRef.current?.disconnect();
    setAuth(null);
    setPeer(null);
    setRoomId('');
    setMessages([]);
    setMessageText('');
    setStatus('Logged out');
    setShowProfilePanel(true);
  }

  function clearChat() {
    setMessages([]);
    setStatus('Chat cleared on this device');
  }

  async function startChat() {
    if (!auth) {
      setStatus('Login first');
      return;
    }
    if (!peerEmail.trim()) {
      setStatus('Enter the other user email');
      return;
    }
    if (peerEmail.trim().toLowerCase() === auth.user.email.toLowerCase()) {
      setStatus('Use another registered user email');
      return;
    }

    setIsLoading(true);
    try {
      const foundPeer = await request<User>(
        `/users/lookup?email=${encodeURIComponent(peerEmail.trim())}`,
      );
      if (!foundPeer) {
        setStatus('No user found with that email');
        return;
      }

      const room = await request<{ id: number; name: string }>('/rooms/private', {
        method: 'POST',
        body: JSON.stringify({ userId: foundPeer.id }),
      });
      setPeer(foundPeer);
      setRoomId(String(room.id));
      socketRef.current?.emit('join_room', { roomId: room.id });
      await loadMessages(room.id);
      setStatus(`Chat opened with ${foundPeer.name || foundPeer.email}`);
      setShowProfilePanel(false);
    } catch (error) {
      setStatus(`Could not start chat: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMessages(targetRoomId = Number(roomIdRef.current)) {
    if (!authRef.current || !targetRoomId) {
      setStatus('Open a chat first');
      return;
    }
    setIsLoading(true);
    try {
      const roomMessages = await request<Message[]>(
        `/rooms/${targetRoomId}/messages`,
      );
      setMessages(roomMessages);
      socketRef.current?.emit('join_room', { roomId: targetRoomId });
      socketRef.current?.emit('message_read', { roomId: targetRoomId });
      setStatus(`Loaded ${roomMessages.length} messages`);
    } catch (error) {
      setStatus(`Load failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function updateMessageText(text: string) {
    setMessageText(text);
    if (!auth || !currentRoomId) {
      return;
    }
    socketRef.current?.emit('typing_start', { roomId: currentRoomId });
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { roomId: currentRoomId });
    }, 700);
  }

  async function sendMessage() {
    const text = messageText.trim();
    if (!auth || !text || !currentRoomId) {
      return;
    }

    setMessageText('');
    socketRef.current?.emit('send_message', {
      roomId: currentRoomId,
      message: text,
    });
    socketRef.current?.emit('typing_stop', { roomId: currentRoomId });
    setStatus('Message sent');
  }

  function handleComposerKeyPress(event: ComposerKeyEvent) {
    if (event.nativeEvent.key !== 'Enter' || event.nativeEvent.shiftKey) {
      return;
    }
    event.nativeEvent.preventDefault?.();
    void sendMessage();
  }

  function formatMessageTime(value: string) {
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appName}>Realtime Chat</Text>
            <Text style={styles.appMeta}>Private messaging over Socket.IO</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              style={styles.profileButton}
              onPress={() => setShowProfilePanel((visible) => !visible)}
            >
              <Text style={styles.profileButtonText}>
                {auth ? 'Profile' : 'Login'}
              </Text>
            </Pressable>
            <View
              style={[
                styles.statusPill,
                isSocketConnected ? styles.statusOnline : styles.statusOffline,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isSocketConnected ? styles.dotOnline : styles.dotOffline,
                ]}
              />
              <Text style={styles.statusPillText}>
                {isSocketConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.workspace}>
          {showProfilePanel ? (
            <View style={styles.setupOverlay}>
              <View style={styles.setupPanel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {auth ? 'Account' : 'Welcome'}
              </Text>
              <View style={styles.panelHeaderActions}>
                {isLoading ? <ActivityIndicator color="#0f766e" /> : null}
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setShowProfilePanel(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.fieldLabel}>API endpoint</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
            />

            {!auth ? (
              <>
                <View style={styles.segmentedControl}>
                  <Pressable
                    style={[
                      styles.segmentButton,
                      authMode === 'login' && styles.segmentButtonActive,
                    ]}
                    onPress={() => setAuthMode('login')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        authMode === 'login' && styles.segmentTextActive,
                      ]}
                    >
                      Login
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentButton,
                      authMode === 'register' && styles.segmentButtonActive,
                    ]}
                    onPress={() => setAuthMode('register')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        authMode === 'register' && styles.segmentTextActive,
                      ]}
                    >
                      Register
                    </Text>
                  </Pressable>
                </View>

                {authMode === 'register' ? (
                  <>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      autoCapitalize="words"
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                    />
                  </>
                ) : null}

                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />

                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword((visible) => !visible)}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable style={styles.actionButton} onPress={submitAuth}>
                  <Text style={styles.actionButtonText}>
                    {authMode === 'login' ? 'Login' : 'Create Account'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.accountRow}>
                  <View style={styles.selfAvatar}>
                    <Text style={styles.selfAvatarText}>
                      {(currentUser?.name || currentUser?.email || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.accountText}>
                    <Text style={styles.accountName}>
                      {currentUser?.name || 'Signed in'}
                    </Text>
                    <Text style={styles.accountEmail}>{currentUser?.email}</Text>
                  </View>
                  <Pressable style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Chat with email</Text>
                <View style={styles.peerRow}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={[styles.input, styles.peerInput]}
                    value={peerEmail}
                    onChangeText={setPeerEmail}
                  />
                  <Pressable style={styles.actionButton} onPress={startChat}>
                    <Text style={styles.actionButtonText}>Start</Text>
                  </Pressable>
                </View>
              </>
            )}

            <Text style={styles.statusText} numberOfLines={2}>
              {status}
            </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.chatPanel}>
            <View style={styles.chatHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {peerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatName}>{peerName}</Text>
                <Text style={styles.chatSubline}>
                  {roomId
                    ? `Room ${roomId} . ${messages.length} messages`
                    : 'Start a private chat'}
                </Text>
              </View>
              <Pressable
                style={styles.reloadButton}
                onPress={() => void loadMessages()}
              >
                <Text style={styles.reloadButtonText}>Sync</Text>
              </Pressable>
              <Pressable style={styles.clearButton} onPress={clearChat}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            </View>

            <FlatList
              ref={messagesListRef}
              contentContainerStyle={[
                styles.messages,
                messages.length === 0 && styles.emptyMessages,
              ]}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              onContentSizeChange={() =>
                messagesListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No chat selected</Text>
                  <Text style={styles.emptyCopy}>
                    Login, enter another registered user email, then start a
                    private chat.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMine = item.sender.id === currentUser?.id;
                return (
                  <View
                    style={[
                      styles.messageGroup,
                      isMine ? styles.mineGroup : styles.theirGroup,
                    ]}
                  >
                    <Text style={styles.senderLabel}>
                      {isMine ? 'You' : item.sender.name}
                    </Text>
                    <View
                      style={[
                        styles.messageBubble,
                        isMine ? styles.mineBubble : styles.theirBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMine ? styles.mineText : styles.theirText,
                        ]}
                      >
                        {item.message}
                      </Text>
                      <Text
                        style={[
                          styles.messageMeta,
                          isMine ? styles.mineMeta : styles.theirMeta,
                        ]}
                      >
                        {formatMessageTime(item.createdAt)} . {item.status}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.typingRow}>
              <Text style={styles.typingText}>
                {typingUser ? `${peerName} is typing...` : ' '}
              </Text>
            </View>

            <View style={styles.composer}>
              <TextInput
                multiline
                placeholder={
                  roomId ? 'Write a message' : 'Start a chat to send messages'
                }
                placeholderTextColor="#8a94a6"
                style={styles.composerInput}
                value={messageText}
                editable={Boolean(roomId)}
                onChangeText={updateMessageText}
                onKeyPress={handleComposerKeyPress}
              />
              <Pressable
                disabled={!canSend}
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  screen: {
    flex: 1,
    gap: 14,
    padding: 16,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 14,
  },
  profileButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  appName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  appMeta: {
    color: '#b9c2d0',
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  statusOnline: {
    backgroundColor: '#d1fae5',
  },
  statusOffline: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dotOnline: {
    backgroundColor: '#059669',
  },
  dotOffline: {
    backgroundColor: '#dc2626',
  },
  statusPillText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  workspace: {
    flex: 1,
    position: 'relative',
  },
  setupOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  setupPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e0ea',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    gap: 10,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  closeButton: {
    backgroundColor: '#eef2f7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  closeButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#5b6678',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    color: '#111827',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 78,
  },
  passwordToggle: {
    alignItems: 'center',
    bottom: 6,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 10,
    position: 'absolute',
    right: 6,
    top: 6,
  },
  passwordToggleText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '900',
  },
  segmentedControl: {
    backgroundColor: '#eef2f7',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  segmentButtonActive: {
    backgroundColor: '#111827',
  },
  segmentText: {
    color: '#475569',
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  accountRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  selfAvatar: {
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selfAvatarText: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    color: '#111827',
    fontWeight: '900',
  },
  accountEmail: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#991b1b',
    fontWeight: '800',
  },
  peerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  peerInput: {
    flex: 1,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  reloadButton: {
    alignItems: 'center',
    backgroundColor: '#e5eef7',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 14,
  },
  reloadButtonText: {
    color: '#203047',
    fontWeight: '800',
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#991b1b',
    fontWeight: '900',
  },
  statusText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  chatPanel: {
    backgroundColor: '#f4f6f8',
    borderColor: '#d9e0ea',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  chatHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#d9e0ea',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  chatSubline: {
    color: '#697386',
    fontSize: 12,
    marginTop: 2,
  },
  messages: {
    gap: 12,
    padding: 14,
  },
  emptyMessages: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 280,
    padding: 18,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyCopy: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  messageGroup: {
    maxWidth: '82%',
  },
  mineGroup: {
    alignSelf: 'flex-end',
  },
  theirGroup: {
    alignSelf: 'flex-start',
  },
  senderLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageBubble: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mineBubble: {
    backgroundColor: '#2563eb',
  },
  theirBubble: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e0ea',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  mineText: {
    color: '#ffffff',
  },
  theirText: {
    color: '#111827',
  },
  messageMeta: {
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  mineMeta: {
    color: '#dbeafe',
  },
  theirMeta: {
    color: '#7b8794',
  },
  typingRow: {
    minHeight: 24,
    paddingHorizontal: 14,
  },
  typingText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderTopColor: '#d9e0ea',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  composerInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    flex: 1,
    maxHeight: 104,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
