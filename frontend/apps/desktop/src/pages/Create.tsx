import { useState, useEffect } from "react";
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
  HStack,
  Text,
  Spinner,
  ChevronDownIcon,
} from "@story2video/ui";
import {
  StoryStyle,
  useCreateStory,
  useOperationQuery,
  extractOperationId,
} from "@story2video/core";

const Create = () => {
  // 用户输入的脚本文本（将作为创建故事的脚本内容 script_content）
  const [storyText, setStoryText] = useState("");
  // 风格（与后端枚举保持一致：movie / anime / realistic）
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.MOVIE);
  // Operation ID（任务 ID），用于轮询进度
  const [operationId, setOperationId] = useState<string | null>(null);
  // 错误信息
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // 创建故事 mutation
  const createStoryMutation = useCreateStory();

  // 使用 TanStack Query 轮询操作进度（5秒间隔）
  const operationQuery = useOperationQuery(operationId, {
    onSuccess: (data) => {
      // 成功时跳转到分镜页面
      if (data.status === "succeeded") {
        navigate(`/storyboard?storyId=${data.story_id}`);
      }
    },
  });

  // 监听操作失败
  useEffect(() => {
    if (operationQuery.isFailed && operationQuery.errorMessage) {
      setErrorMessage(operationQuery.errorMessage);
    }
  }, [operationQuery.isFailed, operationQuery.errorMessage]);

  // 点击创建故事
  const handleGenerate = async () => {
    setErrorMessage(null);
    setOperationId(null);

    // 基础校验：脚本文本不能为空
    if (!storyText.trim()) {
      setErrorMessage("Please enter story text.");
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
      console.error("Create story error:", error);
      const msg = error?.message || "创建故事失败，请检查后端服务是否运行。";
      setErrorMessage(msg);
    }
  };

  const isLoading = createStoryMutation.isPending || (operationQuery.isLoading && !!operationId);
  const isPolling = !!operationId && !operationQuery.isComplete;

  return (
    <Box
      flex={1}
      p="$8"
      bg="$backgroundLight0"
      justifyContent="center"
      alignItems="center"
    >
      <VStack
        space="xl"
        width="100%"
        maxWidth={600}
        className="animate-fade-in"
      >
        <VStack space="xs">
          <Heading size="2xl">Create New Story</Heading>
          <Text size="sm" color="$textLight500">
            Enter your story details below to generate a video storyboard.
          </Text>
        </VStack>

        <VStack space="md">
          <Text fontWeight="$bold">Story Text</Text>
          <Textarea size="xl" h={200} className="rounded-2xl">
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
            <SelectTrigger variant="outline" size="md" className="rounded-xl">
              <SelectInput placeholder="Select option" />
              <SelectIcon mr="$3" as={ChevronDownIcon} />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                <SelectItem label="Movie" value="movie" />
                <SelectItem label="Animation" value="anime" />
                <SelectItem label="Realistic" value="realistic" />
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
          className="rounded-full"
        >
          {(isLoading || isPolling) && <Spinner color="$white" mr="$2" />}
          <ButtonText>
            {isPolling ? "Generating..." : isLoading ? "Submitting..." : "Generate Story"}
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
  );
};

export default Create;
