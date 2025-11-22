import React, { useEffect, useState } from "react";
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
  Text,
  Spinner,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Icon,
  ChevronDownIcon,
} from "@story2video/ui";
import {
  useSocket,
  GenerationState,
  StoryStyle,
  useSdk,
} from "@story2video/core";

export default function CreateScreen() {
  const [storyText, setStoryText] = useState("");
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.STYLE_MOVIE);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  // 统一 HTTP 客户端与 WebSocket 管理器
  const sdk = useSdk();
  const { socket } = useSocket();

  // 任务相关状态：Operation ID、进度、状态、结果资源名
  const [operationId, setOperationId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<GenerationState | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);

  // 当拿到 Operation ID 后，通过 WebSocket 订阅该任务进度（OPERATION_PROGRESS / OPERATION_DONE）
  useEffect(() => {
    if (!operationId || !socket) return;
    const unsubscribe = socket.subscribe(operationId, (payload) => {
      // 更新进度与状态
      setProgress(payload.progress_percent);
      setStatus(payload.state);

      // 失败时显示错误提示（error 字段可能不存在，注意判空）
      if ("error" in payload && (payload as any).error) {
        toast.show({
          placement: "top",
          render: ({ id }) => (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>错误</ToastTitle>
              <ToastDescription>
                {(payload as any).error?.message || "生成失败"}
              </ToastDescription>
            </Toast>
          ),
        });
      }

      // 成功时保存结果资源名，并示例跳转到分镜页
      if (
        "result_resource_name" in payload &&
        (payload as any).result_resource_name
      ) {
        setResultName((payload as any).result_resource_name);
      }
      if (payload.state === GenerationState.STATE_SUCCEEDED) {
        router.push("/storyboard");
      }
    });
    return () => unsubscribe();
  }, [operationId, socket, toast]);

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
    setLoading(true);
    try {
      // 组装请求体（参考接口文档：POST /v1/stories）
      const body = {
        story: {
          display_name: storyText.slice(0, 20) || "Untitled",
          script_content: storyText,
          // 与后端枚举保持一致：STYLE_MOVIE / STYLE_ANIME / STYLE_REALISTIC
          style,
        },
      };
      // 发送请求，服务端将立即返回 Operation（包含任务 ID）
      const op = await sdk.stories.create(body);
      if (!op?.name) {
        throw new Error("未返回任务 ID");
      }
      // 记录 Operation ID，后续通过 WebSocket 订阅进度
      setOperationId(op.name);
    } catch (error) {
      // 统一错误提示
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>错误</ToastTitle>
              <ToastDescription>创建故事失败，请稍后重试</ToastDescription>
            </Toast>
          );
        },
      });
    } finally {
      setLoading(false);
    }
  };

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
                    <SelectItem label="电影" value="STYLE_MOVIE" />
                    <SelectItem label="动画" value="STYLE_ANIME" />
                    <SelectItem label="写实" value="STYLE_REALISTIC" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <Button
              size="xl"
              variant="solid"
              action="primary"
              isDisabled={loading}
              onPress={handleGenerate}
              mt="$4"
            >
              {loading && <Spinner color="$white" mr="$2" />}
              <ButtonText>{loading ? "生成中..." : "生成故事"}</ButtonText>
            </Button>
            {operationId && (
              <VStack space="xs" mt="$4">
                {/* 显示当前订阅的任务 ID */}
                <Text>任务 ID：{operationId}</Text>
                {/* 实时进度与状态 */}
                <Text>进度：{progress}%</Text>
                <Text>状态：{status ?? "N/A"}</Text>
                {/* 如果服务端返回了结果资源名，则显示 */}
                {resultName && <Text>结果：{resultName}</Text>}
              </VStack>
            )}
          </VStack>
        </Box>
      </SafeAreaView>
    </Box>
  );
}
