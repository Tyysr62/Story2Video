import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronDownIcon,
} from "@story2video/ui";
import {
  useSocket,
  GenerationState,
  StoryStyle,
  useSdk,
} from "@story2video/core";

const Create = () => {
  // 用户输入的脚本文本（将作为创建故事的脚本内容 script_content）
  const [storyText, setStoryText] = useState("");
  // 风格（与后端枚举保持一致：STYLE_MOVIE / STYLE_ANIME / STYLE_REALISTIC）
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.STYLE_MOVIE);
  // 提交中加载态
  const [loading, setLoading] = useState(false);
  // Operation ID（任务 ID），用于 WebSocket 订阅进度
  const [operationId, setOperationId] = useState<string | null>(null);
  // 实时进度（百分比）
  const [progress, setProgress] = useState<number>(0);
  // 任务状态（运行中/成功/失败等）
  const [status, setStatus] = useState<GenerationState | null>(null);
  // 结果资源名（成功时可能返回，如 stories/{id} 或视频 URL）
  const [resultName, setResultName] = useState<string | null>(null);
  // 错误信息
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  // 使用统一封装的 HTTP 客户端与 WebSocket 管理器
  const sdk = useSdk();
  const { socket } = useSocket();

  // 当拿到 Operation ID 后，通过 WebSocket 订阅任务进度与完成状态
  useEffect(() => {
    if (!operationId || !socket) return;

    const unsubscribe = socket.subscribe(operationId, (payload) => {
      // 更新进度与状态
      setProgress(payload.progress_percent);
      setStatus(payload.state);

      // 若失败，可能携带 error.message（注意可选字段判空）
      if ("error" in payload && payload.error) {
        setErrorMessage(("error" in payload && (payload as any).error?.message) || "生成失败");
      }

      // 若成功，保存结果资源名并跳转
      if ("result_resource_name" in payload && payload.result_resource_name) {
        setResultName(payload.result_resource_name || null);
      }
      if (payload.state === GenerationState.STATE_SUCCEEDED) {
        navigate("/storyboard");
      }
    });

    // 组件卸载或 Operation 变化时取消订阅
    return () => {
      unsubscribe();
    };
  }, [operationId, socket, navigate]);

  // 点击创建故事：调用 REST API（POST /v1/stories），并基于返回的 Operation 通过 WebSocket 订阅进度
  const handleGenerate = async () => {
    setErrorMessage(null);
    // 1) 基础校验：脚本文本不能为空
    if (!storyText.trim()) {
      setErrorMessage("Please enter story text.");
      return;
    }
    setLoading(true);
    try {
      // Check if SDK is available
      if (!sdk || !sdk.stories) {
        throw new Error("API 服务未初始化");
      }
      // 2) 组装请求体（根据接口文档）
      // - display_name 这里演示用脚本文本前 20 个字符，实际可让用户单独输入
      const body = {
        story: {
          display_name: storyText.slice(0, 20) || "Untitled",
          script_content: storyText,
          style, // 与后端枚举保持一致：STYLE_MOVIE / STYLE_ANIME / STYLE_REALISTIC
        },
      };
      // 3) 发送创建故事请求，服务端应立即返回 Operation（包含任务 ID）
      const op = await sdk.stories.create(body);
      if (!op?.name) {
        throw new Error("未返回任务 ID");
      }
      // 记录 Operation ID，稍后通过 WebSocket 订阅进度
      setOperationId(op.name);
    } catch (error: any) {
      console.error("Create story error:", error);
      const msg = error?.message || "创建故事失败，请检查后端服务是否运行。";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      flex={1}
      p="$6"
      bg="$backgroundLight0"
      justifyContent="center"
      alignItems="center"
    >
      <VStack
        space="xl"
        width="100%"
        maxWidth={600}
      >
        <VStack space="xs">
          <Heading size="2xl">Create New Story</Heading>
          <Text size="sm" color="$textLight500">
            Enter your story details below to generate a video storyboard.
          </Text>
        </VStack>

        <VStack space="md">
          <Text fontWeight="$bold">Story Text</Text>
          <Textarea size="xl" h={200}>
            <TextareaInput
              placeholder="Once upon a time..."
              value={storyText}
              onChangeText={setStoryText}
            />
          </Textarea>
        </VStack>

        <VStack space="md">
          <Text fontWeight="$bold">Style</Text>
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
                <SelectItem label="Movie" value="STYLE_MOVIE" />
                <SelectItem label="Animation" value="STYLE_ANIME" />
                <SelectItem label="Realistic" value="STYLE_REALISTIC" />
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
          borderRadius="$full"
        >
          {loading && <Spinner color="$white" mr="$2" />}
          <ButtonText>
            {loading ? "Generating..." : "Generate Story"}
          </ButtonText>
        </Button>
        
        {/* 错误信息提示 */}
        {errorMessage && (
          <Box 
            bg="$error100" 
            p="$3" 
            borderRadius="$md"
            borderWidth={1}
            borderColor="$error300"
          >
            <Text color="$error700">{errorMessage}</Text>
          </Box>
        )}
        
        {/* 任务进度与状态（示例展示） */}
        {operationId && (
          <VStack space="xs" mt="$4">
            {/* 显示当前订阅的任务 ID */}
            <Text>Operation: {operationId}</Text>
            {/* 显示实时进度与状态 */}
            <Text>进度：{progress}%</Text>
            <Text>状态：{status ?? "N/A"}</Text>
            {/* 如果服务端返回了结果资源名，则显示 */}
            {resultName && <Text>结果：{resultName}</Text>}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default Create;
