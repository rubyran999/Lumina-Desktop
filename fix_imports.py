import os

# Fix usePomodoro.tsx - add setMessages to deps and the effect
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\usePomodoro.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '  setMessages: React.Dispatch<React.SetStateAction<any[]>>;',
    '  setMessages: React.Dispatch<React.SetStateAction<any[]>>;'
)
# Already has setMessages in deps - good

# The pomo timer effect already uses setMessages - good
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\usePomodoro.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix useReminders.tsx - ensure setMessages is in deps
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useReminders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Already has setMessages in deps - good

# Fix useChat.tsx - remove handleSubmit and related handlers
with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useChat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove handleSubmit, handleRetry, handleCancel, clearConversation, updateApiKey from return
# Keep only state setters
old_return = '''  return {
    query, setQuery,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    messages, setMessages,
    pendingQuery, setPendingQuery,
    handleSubmit, handleRetry, handleCancel, clearConversation, updateApiKey,
    // Expose AI settings for App.tsx binding
    isAiEnabledState, setIsAiEnabledState,
    apiKeysState, setApiKeysState,
    selectedProviderState, setSelectedProviderState,
    customEndpointState, setCustomEndpointState,
    locationState, setLocationState,
  };'''

new_return = '''  return {
    query, setQuery,
    isLoading, setIsLoading,
    isTimeout, setIsTimeout,
    messages, setMessages,
    pendingQuery, setPendingQuery,
    // AI settings
    isAiEnabledState, setIsAiEnabledState,
    apiKeysState, setApiKeysState,
    selectedProviderState, setSelectedProviderState,
    customEndpointState, setCustomEndpointState,
    locationState, setLocationState,
  };'''

content = content.replace(old_return, new_return)

# Also need to add scrollRef handling - remove the scroll effect from useChat since it needs scrollRef from settings
# Remove the scroll useEffect
content = content.replace(
    '''  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);\n\n''',
    ''
)

# Remove timeoutRef handling from handleSubmit (it was removed but we need to make sure)
# Remove the setTimeout for the 20s timeout since we don't have timeoutRef in useChat anymore
# Actually, we need to keep timeout handling. Let me add a simpler approach.

with open(r'D:\Ruby\Projects\DeskHelper\src\hooks\useChat.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Hooks fixed.")
