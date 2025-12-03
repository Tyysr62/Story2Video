import { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  BadgeText,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Pressable,
  Icon,
  ArrowLeftIcon,
} from "@story2video/ui";
import {
  useShots,
  useCompileVideo,
  useOperationQuery,
  extractOperationId,
  ShotStatus,
} from "@story2video/core";

export default function StoryboardScreen() {
  const { storyId = "" } = useLocalSearchParams<{ storyId?: string }>();
  const toast = useToast();

  // 编译视频操作 ID
  const [compileOperationId, setCompileOperationId] = useState<string | null>(null);

  // 使用 TanStack Query 获取 shots 列表
  const { data: shotsData, isLoading, error, refetch } = useShots(storyId);
  const shots = shotsData?.shots ?? [];

  // 编译视频 mutation
  const compileVideoMutation = useCompileVideo();

  // 轮询编译进度
  const compileOperationQuery = useOperationQuery(compileOperationId, {
    onSuccess: (data) => {
      if (data.status === "succeeded") {
        toast.show({
          placement: "top",
          render: ({ id }) => (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>成功</ToastTitle>
              <ToastDescription>视频合成完成！</ToastDescription>
            </Toast>
          ),
        });
        router.push(`/preview?storyId=${storyId}`);
      }
    },
  });

  // 监听编译失败
  useEffect(() => {
    if (compileOperationQuery.isFailed && compileOperationQuery.errorMessage) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{compileOperationQuery.errorMessage}</ToastDescription>
          </Toast>
        ),
      });
    }
  }, [compileOperationQuery.isFailed, compileOperationQuery.errorMessage, toast]);

  const handleDetailClick = (id: string) => {
    router.push(`/shot/${id}?storyId=${storyId}`);
  };

  const handleGenerateVideo = async () => {
    if (!storyId) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>请提供故事 ID。</ToastDescription>
          </Toast>
        ),
      });
      return;
    }

    try {
      const result = await compileVideoMutation.mutateAsync({ storyId });
      if (result?.operation_name) {
        const opId = extractOperationId(result.operation_name);
        setCompileOperationId(opId);
      }
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{err?.message || "视频生成失败"}</ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const getBadgeAction = (status: ShotStatus | string) => {
    switch (status) {
      case ShotStatus.DONE:
      case "Done":
        return "success";
      case ShotStatus.GENERATING:
      case "Generating":
        return "info";
      case ShotStatus.FAILED:
        return "error";
      default:
        return "muted";
    }
  };

  const getStatusText = (status: ShotStatus | string) => {
    switch (status) {
      case ShotStatus.DONE:
        return "已完成";
      case ShotStatus.GENERATING:
        return "生成中";
      case ShotStatus.FAILED:
        return "失败";
      default:
        return status;
    }
  };

  const isGenerating = compileVideoMutation.isPending || (!!compileOperationId && !compileOperationQuery.isComplete);

  // 加载中状态
  if (isLoading) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text mt="$4">正在加载分镜...</Text>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center" p="$4">
        <Text color="$error500" mb="$4">加载分镜失败</Text>
        <Button onPress={() => refetch()}>
          <ButtonText>重试</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack flex={1} space="md" p="$4">
          {/* Header with back button */}
          <HStack alignItems="center" space="md">
            <Pressable onPress={() => router.back()}>
              <Icon as={ArrowLeftIcon} size="xl" color="$textLight800" />
            </Pressable>
            <VStack flex={1}>
              <Heading size="xl">分镜编辑</Heading>
              <Text color="$textLight500" size="sm">
                上下滑动查看分镜
              </Text>
            </VStack>
          </HStack>

          <Box flex={1}>
            {shots.length === 0 ? (
              <Box alignItems="center" py="$8">
                <Text color="$textLight400">暂无分镜</Text>
              </Box>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingVertical: 8,
                }}
              >
                <VStack space="md">
                  {shots.map((shot) => (
                    <Pressable
                      key={shot.id}
                      onPress={() => handleDetailClick(shot.id)}
                    >
                      <HStack
                        bg="$white"
                        borderRadius="$lg"
                        borderColor="$borderLight200"
                        borderWidth={1}
                        overflow="hidden"
                        alignItems="center"
                      >
                        <Image
                          source={{ uri: shot.image_url || `https://placehold.co/600x400/png?text=Shot+${shot.sequence}` }}
                          alt={`Shot ${shot.sequence}`}
                          h={100}
                          w={120}
                          resizeMode="cover"
                        />
                        <VStack flex={1} space="xs" p="$3">
                          <Heading size="sm" isTruncated>
                            分镜 {shot.sequence}
                          </Heading>
                          <Text size="xs" color="$textLight500" numberOfLines={2}>
                            {shot.details || "未命名"}
                          </Text>
                          <Badge
                            size="sm"
                            variant="solid"
                            borderRadius="$sm"
                            action={getBadgeAction(shot.status)}
                            alignSelf="flex-start"
                          >
                            <BadgeText>{getStatusText(shot.status)}</BadgeText>
                          </Badge>
                        </VStack>
                        <Box pr="$3">
                          <Icon as={ArrowLeftIcon} size="md" color="$textLight400" style={{ transform: [{ rotate: '180deg' }] }} />
                        </Box>
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>
              </ScrollView>
            )}
          </Box>

          <Box py="$2">
            <Button
              size="xl"
              action="primary"
              onPress={handleGenerateVideo}
              isDisabled={isGenerating || shots.length === 0}
            >
              {isGenerating && <Spinner mr="$2" color="$white" />}
              <ButtonText>
                {isGenerating ? "合成中..." : "生成视频"}
              </ButtonText>
            </Button>
            {compileOperationId && !compileOperationQuery.isComplete && (
              <Text size="xs" color="$textLight400" mt="$2" textAlign="center">
                每 5 秒自动刷新状态
              </Text>
            )}
          </Box>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
