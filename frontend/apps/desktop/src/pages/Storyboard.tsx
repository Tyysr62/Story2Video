import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  ScrollView,
  Image,
  Badge,
  BadgeText,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@story2video/ui";
import {
  useShots,
  useCompileVideo,
  useOperationQuery,
  extractOperationId,
  ShotStatus,
} from "@story2video/core";

const Storyboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get("storyId") || "";
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
        navigate(`/preview?storyId=${storyId}`);
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
    navigate(`/shot/${id}?storyId=${storyId}`);
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
    <Box flex={1} bg="$backgroundLight0" p="$4">
      <VStack space="md" flex={1}>
        <Box>
          <Heading size="xl">分镜列表</Heading>
          <Text color="$textLight500">
            在生成视频前检查并编辑每个分镜。
          </Text>
        </Box>

        <Box flex={1} justifyContent="center">
          {shots.length === 0 ? (
            <Box alignItems="center" py="$8">
              <Text color="$textLight400">暂无分镜</Text>
            </Box>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
            >
              <HStack space="lg">
                {shots.map((shot) => (
                  <Box
                    key={shot.id}
                    width={300}
                    bg="$white"
                    borderRadius="$lg"
                    borderColor="$borderLight200"
                    borderWidth={1}
                    overflow="hidden"
                    shadowColor="$black"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.1}
                    shadowRadius={4}
                    elevation={2}
                  >
                    <Image
                      source={{
                        uri:
                          shot.image_url ||
                          `https://placehold.co/600x400/png?text=${encodeURIComponent(`分镜 ${shot.sequence}`)}`,
                      }}
                      alt={`分镜 ${shot.sequence}`}
                      h={180}
                      w="100%"
                      resizeMode="cover"
                    />
                    <VStack space="sm" p="$4">
                      <VStack>
                        <Heading size="sm" isTruncated>
                          分镜 {shot.sequence}: {shot.details?.slice(0, 20) || "未命名"}
                        </Heading>
                        <HStack mt="$1">
                          <Badge
                            size="sm"
                            variant="solid"
                            borderRadius="$sm"
                            action={getBadgeAction(shot.status)}
                          >
                            <BadgeText>{getStatusText(shot.status)}</BadgeText>
                          </Badge>
                        </HStack>
                      </VStack>

                      <Button
                        size="sm"
                        variant="outline"
                        action="secondary"
                        onPress={() => handleDetailClick(shot.id)}
                        mt="$2"
                      >
                        <ButtonText>查看详情</ButtonText>
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </HStack>
            </ScrollView>
          )}
        </Box>

        <Box py="$4" borderTopWidth={1} borderColor="$borderLight200" alignItems="center">
          <Button
            size="xl"
            action="primary"
            onPress={handleGenerateVideo}
            isDisabled={isGenerating || shots.length === 0}
            width="100%"
            maxWidth={400}
          >
            {isGenerating && <Spinner mr="$2" color="$white" />}
            <ButtonText>
              {isGenerating ? "正在合成视频..." : "生成视频"}
            </ButtonText>
          </Button>
          {compileOperationId && !compileOperationQuery.isComplete && (
            <Text size="xs" color="$textLight400" mt="$2">
              每 5 秒自动刷新状态
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default Storyboard;
