import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotification } from '@/hooks/usePushNotification';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function PushNotificationPrompt() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotification();
  const [isLoading, setIsLoading] = useState(false);
  const savePushSubscription = trpc.notification.savePushSubscription.useMutation();

  useEffect(() => {
    // Auto-prompt on first visit
    if (isSupported && !isSubscribed && !localStorage.getItem('push-prompt-shown')) {
      localStorage.setItem('push-prompt-shown', 'true');
      handleSubscribe();
    }
  }, [isSupported, isSubscribed]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const subscription = await subscribe();
      if (subscription) {
        const json = subscription.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await savePushSubscription.mutateAsync({
            subscription: {
              endpoint: json.endpoint,
              keys: {
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
              },
            },
          });
          toast.success('푸시 알림이 활성화되었습니다! 💬');
        }
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('푸시 알림 활성화에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await unsubscribe();
      toast.success('푸시 알림이 비활성화되었습니다');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('푸시 알림 비활성화에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {isSubscribed ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnsubscribe}
          disabled={isLoading}
          className="gap-2"
        >
          <BellOff className="w-4 h-4" />
          알림 끄기
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleSubscribe}
          disabled={isLoading}
          className="gap-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500"
        >
          <Bell className="w-4 h-4" />
          알림 켜기
        </Button>
      )}
    </div>
  );
}
