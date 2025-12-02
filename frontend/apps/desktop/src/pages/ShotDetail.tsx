import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  ArrowLeftIcon,
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
  extractOperationId,
  ShotStatus,
} from "@story2video/core";

const ShotDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get("storyId") || "";
  const navigate = useNavigate();
  const toast = useToast();

  // 获取 shot 数据
  const { data: shot, isLoading, error, refetch } = useShot(storyId, id || "");

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
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Image regenerated successfully.</ToastDescription>
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
            <ToastTitle>Error</ToastTitle>
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
      }
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{err?.message || "Failed to generate image."}</ToastDescription>
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
        render: ({ id: toastNativeId }) => (
          <Toast action="success" variant="accent" nativeID={toastNativeId}>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Shot updated successfully.</ToastDescription>
          </Toast>
        ),
      });
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id: toastNativeId }) => (
          <Toast action="error" variant="accent" nativeID={toastNativeId}>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{err?.message || "Failed to save shot."}</ToastDescription>
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
      case ShotStatus.DONE: return "Done";
      case ShotStatus.GENERATING: return "Generating";
      case ShotStatus.FAILED: return "Failed";
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
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text mt="$4">Loading shot...</Text>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center" p="$4">
        <Text color="$error500" mb="$4">Failed to load shot</Text>
        <Button onPress={() => refetch()}>
          <ButtonText>Retry</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      {/* Header */}
      <HStack
        justifyContent="space-between"
        alignItems="center"
        pb="$4"
        borderBottomWidth={1}
        borderColor="$borderLight200"
        mb="$4"
      >
        <Button variant="link" onPress={() => navigate(`/storyboard?storyId=${storyId}`)} p="$0">
          <Icon as={ArrowLeftIcon} mr="$2" />
          <ButtonText color="$textLight800">Back to Storyboard</ButtonText>
        </Button>

        <HStack space="md" alignItems="center">
          <Heading size="md">Shot {shot?.sequence || id}</Heading>
          <Badge
            size="md"
            variant="solid"
            borderRadius="$sm"
            action={getBadgeAction(status)}
          >
            <BadgeText>{getStatusText(status)}</BadgeText>
          </Badge>
        </HStack>

        <Button
          action="secondary"
          size="md"
          onPress={handleSave}
          isDisabled={updateShotMutation.isPending}
        >
          {updateShotMutation.isPending && <Spinner color="$primary500" mr="$2" />}
          <ButtonText>Save Changes</ButtonText>
        </Button>
      </HStack>

      <HStack flex={1} space="xl" flexDirection={{ base: "column", md: "row" }}>
        {/* Left Column: Image Preview */}
        <VStack flex={1} space="md">
          <Box
            flex={1}
            bg="$backgroundLight100"
            borderRadius="$lg"
            overflow="hidden"
            justifyContent="center"
            alignItems="center"
            borderWidth={1}
            borderColor="$borderLight200"
            maxHeight={400}
          >
            <Image
              source={{ uri: imageUrl }}
              alt="Shot Preview"
              w="100%"
              h="100%"
              resizeMode="contain"
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
                  Generating...
                </Text>
              </Box>
            )}
          </Box>
          <Button
            action="primary"
            size="lg"
            onPress={handleGenerateImage}
            isDisabled={isRegenerating}
          >
            <ButtonText>
              {isRegenerating ? "Processing..." : "Regenerate Image"}
            </ButtonText>
          </Button>
          {regenerateOperationId && !regenerateOperationQuery.isComplete && (
            <Text size="xs" color="$textLight400" textAlign="center">
              每 5 秒自动刷新状态
            </Text>
          )}
        </VStack>

        {/* Right Column: Controls */}
        <VStack
          flex={1}
          space="lg"
          bg="$white"
          p="$6"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
        >
          <VStack space="sm">
            <Text fontWeight="$bold">Prompt</Text>
            <Textarea size="md" w="100%">
              <TextareaInput
                placeholder="Describe the scene..."
                value={prompt}
                onChangeText={setPrompt}
              />
            </Textarea>
            <Text size="xs" color="$textLight400">
              Modify the prompt to regenerate the image.
            </Text>
          </VStack>

          <VStack space="sm">
            <Text fontWeight="$bold">Transition Effect</Text>
            <Select selectedValue={transition} onValueChange={setTransition}>
              <SelectTrigger variant="outline" size="md">
                <SelectInput placeholder="Select effect" />
                <SelectIcon mr="$3">
                  <Icon as={ChevronDownIcon} />
                </SelectIcon>
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  <SelectItem label="Ken Burns" value="ken_burns" />
                  <SelectItem label="Crossfade" value="crossfade" />
                  <SelectItem label="Volume Mix" value="volume_mix" />
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>

          <VStack space="sm">
            <Text fontWeight="$bold">Narration</Text>
            <Textarea size="md" w="100%">
              <TextareaInput
                placeholder="Enter voiceover text..."
                value={narration}
                onChangeText={setNarration}
              />
            </Textarea>
          </VStack>
        </VStack>
      </HStack>
    </Box>
  );
};

export default ShotDetail;
