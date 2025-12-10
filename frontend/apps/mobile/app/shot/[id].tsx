import { useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  Box,
  Heading,
  Textarea,
  TextareaInput,
  Button,
  ButtonText,
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
  VStack,
  HStack,
  Text,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Icon,
  Image,
  Badge,
  BadgeText,
  ChevronDownIcon,
} from "@story2video/ui";
import {
  useShot,
  useUpdateShot,
  useRegenerateShot,
  useOperationQuery,
  useOperationsStore,
  extractOperationId,
  ShotStatus,
  getTransitionOptions,
  getTransitionPlaceholder,
  getTransitionLabel,
} from "@story2video/core";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ShotDetailScreen() {
  const { id, storyId = "" } = useLocalSearchParams<{ id: string; storyId?: string }>();
  const toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const pageBg = isDark ? "$backgroundDark950" : "$backgroundLight0";

  // 获取 shot 数据
  const { data: shot, isLoading, error, refetch } = useShot(storyId, id || "");
  const insets = useSafeAreaInsets();

  // 本地表单状态
  const [prompt, setPrompt] = useState("");
  const [narration, setNarration] = useState("");
  const [transition, setTransition] = useState("ken_burns");

  // 重新生成操作 ID
  const [regenerateOperationId, setRegenerateOperationId] = useState<string | null>(null);

  // Mutations
  const updateShotMutation = useUpdateShot();
  const regenerateShotMutation = useRegenerateShot();

  // 轮询重新生成进度
  const regenerateOperationQuery = useOperationQuery(regenerateOperationId, {
    onSuccess: (data) => {
      if (data.status === "succeeded") {
        toast.show({
          placement: "top",
          render: ({ id }) => (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>成功</ToastTitle>
              <ToastDescription>图像重新生成完成。</ToastDescription>
            </Toast>
          ),
        });
        refetch();
        setRegenerateOperationId(null);
      }
    },
  });

  // 监听重新生成失败
  useEffect(() => {
    if (regenerateOperationQuery.isFailed && regenerateOperationQuery.errorMessage) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{regenerateOperationQuery.errorMessage}</ToastDescription>
          </Toast>
        ),
      });
      setRegenerateOperationId(null);
    }
  }, [regenerateOperationQuery.isFailed, regenerateOperationQuery.errorMessage, toast]);

  // 初始化表单数据
  useEffect(() => {
    if (shot) {
      setPrompt(shot.details || "");
      setNarration(shot.narration || "");
      setTransition(shot.transition || "ken_burns");
    }
  }, [shot]);

  const handleGenerateImage = async () => {
    if (!storyId || !id) return;

    try {
      const result = await regenerateShotMutation.mutateAsync({ storyId, shotId: id });
      if (result?.operation_name) {
        const opId = extractOperationId(result.operation_name);
        setRegenerateOperationId(opId);
        // 将任务添加到 store，以便在任务列表中追踪
        useOperationsStore.getState().addOperation(result.operation_name, {
          storyId,
          shotId: id,
          type: "shot_regen",
        });
      }
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{err?.message || "生成图像失败"}</ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const handleSave = async () => {
    if (!storyId || !id) return;

    try {
      await updateShotMutation.mutateAsync({
        storyId,
        shotId: id,
        data: {
          shot: {
            details: prompt,
            narration,
            transition,
          },
        },
      });
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="success" variant="accent" nativeID={id}>
            <ToastTitle>成功</ToastTitle>
            <ToastDescription>分镜已保存。</ToastDescription>
          </Toast>
        ),
      });
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{err?.message || "保存分镜失败"}</ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const isRegenerating = regenerateShotMutation.isPending || (!!regenerateOperationId && !regenerateOperationQuery.isComplete);
  const imageUrl = shot?.image_url || `https://placehold.co/800x450/png?text=Shot+${id || "1"}`;
  const status = isRegenerating ? ShotStatus.GENERATING : (shot?.status || ShotStatus.GENERATING);

  const getStatusText = (s: ShotStatus | string) => {
    switch (s) {
      case ShotStatus.DONE: return "已完成";
      case ShotStatus.GENERATING: return "生成中";
      case ShotStatus.FAILED: return "失败";
      default: return String(s);
    }
  };

  const getBadgeAction = (s: ShotStatus | string) => {
    switch (s) {
      case ShotStatus.DONE: return "success";
      case ShotStatus.GENERATING: return "info";
      case ShotStatus.FAILED: return "error";
      default: return "muted";
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <Box
        flex={1}
        bg={pageBg}
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="large" />
        <Text mt="$4">正在加载分镜...</Text>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box
        flex={1}
        bg={pageBg}
        justifyContent="center"
        alignItems="center"
        p="$4"
      >
        <Text color="$error500" _dark={{ color: "$error300" }} mb="$4">加载分镜失败</Text>
        <Button onPress={() => refetch()}>
          <ButtonText>重试</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={pageBg}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: (insets.top || 0) + 12,
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
      >
        <VStack space="xl">
          <Box>
            <Heading size="xl">分镜 {shot?.sequence || id}</Heading>
            <Box alignSelf="flex-start" mt="$2">
              <Badge
                size="md"
                variant="solid"
                borderRadius="$sm"
                action={getBadgeAction(status)}
              >
                <BadgeText>{getStatusText(status)}</BadgeText>
              </Badge>
            </Box>
          </Box>

          {/* Image Preview */}
          <Box
            bg="$backgroundLight100"
            borderRadius="$lg"
            overflow="hidden"
            justifyContent="center"
            alignItems="center"
            borderWidth={1}
            borderColor="$borderLight200"
            height={220}
            _dark={{ bg: "$backgroundDark900", borderColor: "$borderDark700" }}
          >
            <Image
              source={{ uri: imageUrl }}
              alt="分镜预览"
              w="100%"
              h="100%"
              resizeMode="cover"
            />
            {isRegenerating && (
              <Box
                position="absolute"
                bg="rgba(0,0,0,0.5)"
                w="100%"
                h="100%"
                justifyContent="center"
                alignItems="center"
              >
                <Spinner size="large" color="$white" />
                <Text color="$white" mt="$2">
                  生成中...
                </Text>
              </Box>
            )}
          </Box>

          <HStack space="md">
            <Button
              flex={1}
              action="primary"
              size="lg"
              onPress={handleGenerateImage}
              isDisabled={isRegenerating}
            >
              <ButtonText>
                {isRegenerating ? "处理中..." : "重新生成"}
              </ButtonText>
            </Button>
            <Button
              flex={1}
              action="secondary"
              size="lg"
              onPress={handleSave}
              isDisabled={updateShotMutation.isPending}
            >
              {updateShotMutation.isPending && <Spinner color="$primary500" mr="$2" />}
              <ButtonText>保存</ButtonText>
            </Button>
          </HStack>

          {regenerateOperationId && !regenerateOperationQuery.isComplete && (
            <Text size="xs" color="$textLight400" _dark={{ color: "$textDark300" }} textAlign="center">
              每 5 秒自动刷新状态
            </Text>
          )}

          {/* Form Controls */}
          <VStack space="lg" mt="$2">
            <VStack space="sm">
              <Text fontWeight="$bold">提示词</Text>
              <Textarea size="md" w="100%">
                <TextareaInput
                  placeholder="描述场景..."
                  value={prompt}
                  onChangeText={setPrompt}
                />
              </Textarea>
              <Text size="xs" color="$textLight400" _dark={{ color: "$textDark300" }}>
                调整提示词以重新生成图像。
              </Text>
            </VStack>

            <VStack space="sm">
              <Text fontWeight="$bold">转换效果</Text>
              <Select selectedValue={transition} initialLabel={getTransitionLabel(transition)} onValueChange={setTransition}>
                <SelectTrigger variant="outline" size="md">
                  <SelectInput placeholder={getTransitionPlaceholder()} />
                  <SelectIcon mr="$3" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    {getTransitionOptions().map((option) => (
                      <SelectItem
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <VStack space="sm">
              <Text fontWeight="$bold">旁白文本</Text>
              <Textarea size="md" w="100%">
                <TextareaInput
                  placeholder="输入旁白内容..."
                  value={narration}
                  onChangeText={setNarration}
                />
              </Textarea>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}
