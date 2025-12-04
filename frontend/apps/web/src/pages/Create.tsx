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
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@story2video/ui";
import {
  StoryStyle,
  useCreateStory,
  useOperationsStore,
  getStoryStyleOptions,
  getStoryStylePlaceholder,
  getStoryStyleLabel,
} from "@story2video/core";

const Create = () => {
  const [storyText, setStoryText] = useState("");
  const [style, setStyle] = useState<StoryStyle>(StoryStyle.MOVIE);
  
  // AlertDialog 状态
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertMessage, setAlertMessage] = useState("");

  const createStoryMutation = useCreateStory();
  const addOperation = useOperationsStore((state) => state.addOperation);

  const showAlertDialog = (type: "success" | "error", message: string) => {
    setAlertType(type);
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleGenerate = async () => {
    if (!storyText.trim()) {
      showAlertDialog("error", "请输入故事文本");
      return;
    }

    try {
      const response = await createStoryMutation.mutateAsync({
        display_name: storyText.slice(0, 20) || "未命名",
        script_content: storyText,
        style,
      });

      if (response?.operation_name) {
        addOperation(response.operation_name, { type: "story_create" });
      } else {
        console.warn("Create story response missing operation_name:", response);
      }

      showAlertDialog("success", "已成功添加到队列，可在任务列表查看进度");
      setStoryText("");
      setStyle(StoryStyle.MOVIE);
    } catch (error: any) {
      console.error("Create story error:", error);
      showAlertDialog("error", error?.message || "创建故事失败，请检查后端服务是否运行");
    }
  };

  const isLoading = createStoryMutation.isPending;

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
          <Heading size="2xl">创建新故事</Heading>
          <Text size="sm" color="$textLight500">输入故事详情以生成视频分镜。</Text>
        </VStack>

        <VStack space="md">
          <Text fontWeight="$bold">故事文本</Text>
          <Textarea size="xl" h={200}>
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
          borderRadius="$full"
        >
          {isLoading ? (
            <>
              <Spinner color="$white" mr="$2" />
              <ButtonText>提交中...</ButtonText>
            </>
          ) : (
            <ButtonText>生成故事</ButtonText>
          )}
        </Button>

        <Text size="sm" color="$textLight400" textAlign="center">提交后可在「任务列表」中查看生成进度</Text>
      </VStack>

      <AlertDialog isOpen={showAlert} onClose={() => setShowAlert(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader><Heading size="lg">{alertType === "success" ? "成功" : "错误"}</Heading></AlertDialogHeader>
          <AlertDialogBody><Text>{alertMessage}</Text></AlertDialogBody>
          <AlertDialogFooter>
            <Button variant="outline" action="secondary" onPress={() => setShowAlert(false)}><ButtonText>确定</ButtonText></Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
};

export default Create;
