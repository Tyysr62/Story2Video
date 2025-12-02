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
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Video synthesis complete!</ToastDescription>
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
            <ToastTitle>Error</ToastTitle>
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
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Story ID is required.</ToastDescription>
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
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{err?.message || "Video generation failed."}</ToastDescription>
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
        return "Done";
      case ShotStatus.GENERATING:
        return "Generating";
      case ShotStatus.FAILED:
        return "Failed";
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
        <Text mt="$4">Loading shots...</Text>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center" p="$4">
        <Text color="$error500" mb="$4">Failed to load shots</Text>
        <Button onPress={() => refetch()}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      <VStack space="md" flex={1}>
        <Box>
          <Heading size="xl">Storyboard</Heading>
          <Text color="$textLight500">
            Review and edit your shots before generating the video.
          </Text>
        </Box>

        <Box flex={1} justifyContent="center">
          {shots.length === 0 ? (
            <Box alignItems="center" py="$8">
              <Text color="$textLight400">No shots available</Text>
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
                      source={{ uri: shot.image_url || `https://placehold.co/600x400/png?text=Shot+${shot.sequence}` }}
                      alt={`Shot ${shot.sequence}`}
                      h={180}
                      w="100%"
                      resizeMode="cover"
                    />
                    <VStack space="sm" p="$4">
                      <VStack>
                        <Heading size="sm" isTruncated>
                          Shot {shot.sequence}: {shot.details?.slice(0, 20) || "Untitled"}
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
                        <ButtonText>Details</ButtonText>
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
              {isGenerating ? "Synthesizing Video..." : "Generate Video"}
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
