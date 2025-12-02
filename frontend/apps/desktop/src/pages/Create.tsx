import { useState } from "react";
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
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@story2video/ui";
import {
  StoryStyle,
  useCreateStory,
  getStoryStyleOptions,
  getStoryStylePlaceholder,
  getStoryStyleLabel,
} from "@story2video/core";

const Create = () => {
  // 用户输入的脚本文本（将作为创建故事的脚本内容 script_content）
  const [storyText, setStoryText] = useState("");
  // 风格（与后端枚举保持一致：movie / anime / realistic）
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.MOVIE);
  const toast = useToast();

  // 创建故事 mutation
  const createStoryMutation = useCreateStory();

  // 点击创建故事
  const handleGenerate = async () => {
    // 基础校验：脚本文本不能为空
    if (!storyText.trim()) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>请输入故事文本</ToastDescription>
          </Toast>
        ),
      });
      return;
    }

    try {
      // 组装请求体（根据接口文档，直接发送而非包裹在 story 对象中）
      await createStoryMutation.mutateAsync({
        display_name: storyText.slice(0, 20) || "未命名",
        script_content: storyText,
        style,
      });

      // 成功后显示提示并清空表单
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="success" variant="accent" nativeID={id}>
            <ToastTitle>成功</ToastTitle>
            <ToastDescription>已成功添加到队列，可在任务列表查看进度</ToastDescription>
          </Toast>
        ),
      });

      // 清空表单，允许用户继续创建新故事
      setStoryText("");
      setStyle(StoryStyle.MOVIE);
    } catch (error: any) {
      console.error("Create story error:", error);
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>
              {error?.message || "创建故事失败，请检查后端服务是否运行"}
            </ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const isLoading = createStoryMutation.isPending;

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
          <Heading size="2xl">创建新故事</Heading>
          <Text size="sm" color="$textLight500">
            输入故事详情以生成视频分镜。
          </Text>
        </VStack>

        <VStack space="md">
          <Text fontWeight="$bold">故事文本</Text>
          <Textarea size="xl" h={200} className="rounded-2xl">
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
            initialLabel={getStoryStyleLabel(style)}
            onValueChange={(v) => setStyle(v as StoryStyle)}
          >
            <SelectTrigger variant="outline" size="md" className="rounded-xl">
              <SelectInput placeholder={getStoryStylePlaceholder()} />
              <SelectIcon mr="$3" as={ChevronDownIcon} />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {getStoryStyleOptions().map((option) => (
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

        <Button
          size="xl"
          variant="solid"
          action="primary"
          isDisabled={isLoading}
          onPress={handleGenerate}
          className="rounded-full"
        >
          {isLoading && <Spinner color="$white" mr="$2" />}
          <ButtonText>
            {isLoading ? "提交中..." : "生成故事"}
          </ButtonText>
        </Button>

        <Text size="sm" color="$textLight400" textAlign="center">
          提交后可在「任务列表」中查看生成进度
        </Text>
      </VStack>
    </Box>
  );
};

export default Create;
