import { useState, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
  ChevronDownIcon,
} from "@story2video/ui";
import {
  StoryStyle,
  useCreateStory,
  useOperationQuery,
  extractOperationId,
} from "@story2video/core";

export default function CreateScreen() {
  const [storyText, setStoryText] = useState("");
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.MOVIE);
  const toast = useToast();

  // 任务相关状态：Operation ID
  const [operationId, setOperationId] = useState<string | null>(null);

  // 创建故事 mutation
  const createStoryMutation = useCreateStory();

  // 使用 TanStack Query 轮询操作进度（5秒间隔）
  const operationQuery = useOperationQuery(operationId, {
    onSuccess: (data) => {
      // 成功时跳转到分镜页面
      if (data.status === "succeeded") {
        router.push("/storyboard");
      }
    },
  });

  // 监听操作失败
  useEffect(() => {
    if (operationQuery.isFailed && operationQuery.errorMessage) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>{operationQuery.errorMessage}</ToastDescription>
          </Toast>
        ),
      });
    }
  }, [operationQuery.isFailed, operationQuery.errorMessage, toast]);

  const handleGenerate = async () => {
    // 基础校验：故事文本不能为空
    if (!storyText.trim()) {
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>错误</ToastTitle>
              <ToastDescription>请输入故事文本</ToastDescription>
            </Toast>
          );
        },
      });
      return;
    }

    try {
      // 组装请求体（根据接口文档，直接发送而非包裹在 story 对象中）
      const result = await createStoryMutation.mutateAsync({
        display_name: storyText.slice(0, 20) || "Untitled",
        script_content: storyText,
        style,
      });

      if (!result?.operation_name) {
        throw new Error("未返回任务 ID");
      }

      // 提取操作 ID 并开始轮询
      const opId = extractOperationId(result.operation_name);
      setOperationId(opId);
    } catch (error: any) {
      // 统一错误提示
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>错误</ToastTitle>
              <ToastDescription>
                {error?.message || "创建故事失败，请稍后重试"}
              </ToastDescription>
            </Toast>
          );
        },
      });
    }
  };

  const isLoading = createStoryMutation.isPending || (operationQuery.isLoading && !!operationId);
  const isPolling = !!operationId && !operationQuery.isComplete;

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }}>
        <Box flex={1} p="$4">
          <VStack space="xl">
            <VStack space="xs">
              <Heading size="2xl">创建新故事</Heading>
              <Text size="sm" color="$textLight500">
                在下方输入你的故事信息以生成分镜。
              </Text>
            </VStack>

            <VStack space="md">
              <Text fontWeight="$bold">故事文本</Text>
              <Textarea size="xl" h={150}>
                <TextareaInput
                  placeholder="从前有座山..."
                  value={storyText}
                  onChangeText={setStoryText}
                />
              </Textarea>
            </VStack>

            <VStack space="md">
              <Text fontWeight="$bold">风格</Text>
              <Select
                selectedValue={style}
                onValueChange={(v) => setStyle(v as StoryStyle)}
              >
                <SelectTrigger variant="outline" size="md">
                  <SelectInput placeholder="Select option" />
                  <SelectIcon mr="$3" as={ChevronDownIcon} />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label="电影" value="movie" />
                    <SelectItem label="动画" value="anime" />
                    <SelectItem label="写实" value="realistic" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <Button
              size="xl"
              variant="solid"
              action="primary"
              isDisabled={isLoading || isPolling}
              onPress={handleGenerate}
              mt="$4"
            >
              {(isLoading || isPolling) && <Spinner color="$white" mr="$2" />}
              <ButtonText>
                {isPolling ? "生成中..." : isLoading ? "提交中..." : "生成故事"}
              </ButtonText>
            </Button>

            {/* 任务进度与状态 */}
            {operationId && operationQuery.data && (
              <VStack space="sm" mt="$4" p="$4" bg="$backgroundLight50" borderRadius="$xl">
                <Text fontWeight="$bold" size="sm">任务状态</Text>
                <HStack space="sm" alignItems="center">
                  <Box
                    w="$3"
                    h="$3"
                    borderRadius="$full"
                    bg={
                      operationQuery.data.status === "succeeded" ? "$success500" :
                      operationQuery.data.status === "failed" ? "$error500" :
                      operationQuery.data.status === "running" ? "$info500" :
                      "$warning500"
                    }
                  />
                  <Text size="sm">
                    {operationQuery.data.status === "queued" && "排队中..."}
                    {operationQuery.data.status === "running" && "生成中..."}
                    {operationQuery.data.status === "succeeded" && "已完成"}
                    {operationQuery.data.status === "failed" && "失败"}
                  </Text>
                </HStack>
                <Text size="xs" color="$textLight400">
                  任务 ID: {operationId.slice(0, 8)}...
                </Text>
                {isPolling && (
                  <Text size="xs" color="$textLight400">
                    每 5 秒自动刷新状态
                  </Text>
                )}
              </VStack>
            )}
          </VStack>
        </Box>
      </SafeAreaView>
    </Box>
  );
}
