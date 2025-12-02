import { useState, useEffect } from "react";
import { ScrollView } from "react-native";
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
  extractOperationId,
  ShotStatus,
} from "@story2video/core";

export default function ShotDetailScreen() {
  const { id, storyId = "" } = useLocalSearchParams<{ id: string; storyId?: string }>();
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
        render: ({ id }) => (
          <Toast action="success" variant="accent" nativeID={id}>
            <ToastTitle>Success</ToastTitle>
            <ToastDescription>Shot updated successfully.</ToastDescription>
          </Toast>
        ),
      });
    } catch (err: any) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
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
    <Box flex={1} bg="$backgroundLight0">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <VStack space="xl">
          <Box>
            <Heading size="xl">Shot {shot?.sequence || id}</Heading>
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
          >
            <Image
              source={{ uri: imageUrl }}
              alt="Shot Preview"
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
                  Generating...
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
                {isRegenerating ? "Processing..." : "Regenerate"}
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
              <ButtonText>Save</ButtonText>
            </Button>
          </HStack>

          {regenerateOperationId && !regenerateOperationQuery.isComplete && (
            <Text size="xs" color="$textLight400" textAlign="center">
              每 5 秒自动刷新状态
            </Text>
          )}

          {/* Form Controls */}
          <VStack space="lg" mt="$2">
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
        </VStack>
      </ScrollView>
    </Box>
  );
}
