import { useEffect, useRef } from 'react';
import { useToast, Toast, ToastTitle, ToastDescription } from '@story2video/ui';
import { useOperationsWithPolling } from '@story2video/core';

export const GlobalToastListener = () => {
  const toast = useToast();
  // Ensure polling is enabled
  const { operations } = useOperationsWithPolling({ enabled: true });

  // Store the IDs of operations we have already notified about
  const notifiedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    // On first load, mark all currently completed operations as "notified"
    if (!initializedRef.current) {
        if (operations.length > 0) {
             operations.forEach(op => {
                if (op.status === 'succeeded' || op.status === 'failed') {
                    notifiedRef.current.add(op.id);
                }
            });
            initializedRef.current = true;
        }
        return;
    }

    // Check for new completions
    operations.forEach(op => {
      const isComplete = op.status === 'succeeded' || op.status === 'failed';
      // If complete and NOT in our notified set, it's a new completion
      if (isComplete && !notifiedRef.current.has(op.id)) {
        const isSuccess = op.status === 'succeeded';
        const title = isSuccess ? "任务完成" : "任务失败";
        let description = "后台任务更新";

        if (op.type === 'story_create') {
            description = isSuccess ? "故事生成完成" : "故事生成失败";
        } else if (op.type === 'video_render') {
            description = isSuccess ? "视频合成完成" : "视频合成失败";
        } else if (op.type === 'shot_regen') {
            description = isSuccess ? "分镜重新生成完成" : "分镜生成失败";
        }

        toast.show({
            placement: "top",
            render: ({ id }) => (
              <Toast action={isSuccess ? "success" : "error"} variant="accent" nativeID={id}>
                <ToastTitle>{title}</ToastTitle>
                <ToastDescription>{description}</ToastDescription>
              </Toast>
            )
        });

        // Mark as notified
        notifiedRef.current.add(op.id);
      }
    });
  }, [operations, toast]);

  return null;
}
