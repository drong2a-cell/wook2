// Push notification handler - 기념일, 메시지, 펫 알림
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '우리만의 공간', body: event.data.text() };
  }

  // 타입별 제목 설정
  let title = data.title || '우리만의 공간 💕';
  if (data.type === 'anniversary') {
    title = '🎉 기념일 알림';
  } else if (data.type === 'message') {
    title = '💬 새 메시지';
  } else if (data.type === 'pet') {
    title = '🐾 펫 알림';
  }

  const notificationOptions = {
    body: data.body || '새로운 알림이 있어요!',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', type: data.type || 'general' },
    tag: data.tag || 'couple-app-notification',
    requireInteraction: data.type === 'anniversary' || data.type === 'message',
    actions: [
      { action: 'open', title: '열기' },
      { action: 'close', title: '닫기' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});
