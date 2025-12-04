import { useState } from "react";
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
  ChevronDownIcon,
} from "@story2video/ui";
import {
  StoryStyle,
  useCreateStory,
  useOperationsStore,
  getStoryStyleOptions,
  getStoryStylePlaceholder,
  getStoryStyleLabel,
} from "@story2video/core";

export default function CreateScreen() {
  const [storyText, setStoryText] = useState("");
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.MOVIE);
  const toast = useToast();

  // 创建故事 mutation
  const createStoryMutation = useCreateStory();
  const addOperation = useOperationsStore((state) => state.addOperation);

  const handleGenerate = async () => {
    // 基础校验：故事文本不能为空
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
      const response = await createStoryMutation.mutateAsync({
        display_name: storyText.slice(0, 20) || "未命名",
        script_content: storyText,
        style,
      });

      // 将任务添加到 store，以便在任务列表中追踪
      if (response?.operation_name) {
        addOperation(response.operation_name, { type: "story_create" });
      } else {
        console.warn("Create story response missing operation_name:", response);
      }

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
      // 统一错误提示
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>错误</ToastTitle>
            <ToastDescription>
              {error?.message || "创建故事失败，请稍后重试"}
            </ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const isLoading = createStoryMutation.isPending;

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
                initialLabel={getStoryStyleLabel(style)}
                onValueChange={(v) => setStyle(v as StoryStyle)}
              >
                <SelectTrigger variant="outline" size="md">
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
              mt="$4"
            >
              {isLoading && <Spinner color="$white" mr="$2" />}
              <ButtonText>
                {isLoading ? "提交中..." : "生成故事"}
              </ButtonText>
            </Button>

            <Text size="sm" color="$textLight400" textAlign="center" mt="$2">
              提交后可在「任务列表」中查看生成进度
            </Text>
          </VStack>
        </Box>
      </SafeAreaView>
    </Box>
  );
}
