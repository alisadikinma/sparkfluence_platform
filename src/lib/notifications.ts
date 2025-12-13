import { supabase } from './supabase';

export type NotificationType = 'video' | 'schedule' | 'profile' | 'system' | 'token' | 'error';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 * Can be called from frontend (with user's own ID) or backend (any user)
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {}
}: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
        read: false
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error creating notification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Pre-defined notification templates
 */
export const NotificationTemplates = {
  videoCompleted: (userId: string, videoTitle?: string) => createNotification({
    userId,
    type: 'video',
    title: 'Video generation completed',
    message: videoTitle ? `"${videoTitle}" is ready to preview` : 'Your video is ready to preview'
  }),

  videoFailed: (userId: string, error?: string) => createNotification({
    userId,
    type: 'error',
    title: 'Video generation failed',
    message: error || 'An error occurred during video generation'
  }),

  postPublished: (userId: string, platform?: string) => createNotification({
    userId,
    type: 'schedule',
    title: 'Scheduled post published',
    message: platform ? `Your post was published to ${platform}` : 'Your scheduled post is now live'
  }),

  profileUpdated: (userId: string) => createNotification({
    userId,
    type: 'profile',
    title: 'Profile updated successfully',
    message: 'Your profile changes have been saved'
  }),

  tokensAdded: (userId: string, amount: number) => createNotification({
    userId,
    type: 'token',
    title: 'Tokens added',
    message: `${amount} tokens have been added to your account`
  }),

  lowTokens: (userId: string, remaining: number) => createNotification({
    userId,
    type: 'token',
    title: 'Low token balance',
    message: `You have ${remaining} tokens remaining. Consider topping up.`
  }),

  welcomeUser: (userId: string, name?: string) => createNotification({
    userId,
    type: 'system',
    title: `Welcome to Sparkfluence${name ? `, ${name}` : ''}!`,
    message: 'Start creating amazing videos with AI'
  })
};
