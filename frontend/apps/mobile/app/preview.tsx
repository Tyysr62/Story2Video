import { useState } from "react";
import { Pressable as RNPressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Spinner,
  Image,
  Pressable,
  Icon,
  ArrowLeftIcon,
} from "@story2video/ui";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useStory } from "@story2video/core";

const FALLBACK_THUMBNAIL = "https://placehold.co/600x400/png?text=Video+Preview";

export default function PreviewScreen() {
  const { storyId = "" } = useLocalSearchParams<{ storyId?: string }>();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 获取故事数据
  const { data: story, isLoading } = useStory(storyId);

  const thumbnailUrl = story?.cover_url || FALLBACK_THUMBNAIL;
  const storyName = story?.title || "我的故事视频";

  const handleExport = async () => {
    setExporting(true);
    try {
      // TODO: 实现实际的导出逻辑
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>成功</ToastTitle>
              <ToastDescription>视频导出完成！</ToastDescription>
            </Toast>
          );
        },
      });
    } catch (err) {
      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="error" variant="accent" nativeID={id}>
              <ToastTitle>错误</ToastTitle>
              <ToastDescription>导出视频失败。</ToastDescription>
            </Toast>
          );
        },
      });
    } finally {
      setExporting(false);
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text mt="$4">正在加载预览...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      <VStack flex={1} space="lg">
        {/* Header with back button */}
        <HStack alignItems="center" space="md" mt="$4">
          <Pressable onPress={() => router.back()}>
            <Icon as={ArrowLeftIcon} size="xl" color="$textLight800" />
          </Pressable>
          <Heading size="xl">视频预览</Heading>
        </HStack>

        {/* Video Player Mock */}
        <Box
          w="100%"
          aspectRatio={16 / 9}
          bg="$black"
          borderRadius="$xl"
          overflow="hidden"
          justifyContent="center"
          alignItems="center"
        >
          <Image
            source={{ uri: thumbnailUrl }}
            alt="Video Thumbnail"
            w="100%"
            h="100%"
            resizeMode="cover"
            opacity={isPlaying ? 0.7 : 1}
          />

          <Box position="absolute">
            <RNPressable onPress={() => setIsPlaying(!isPlaying)}>
              <FontAwesome
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={64}
                color="white"
              />
            </RNPressable>
          </Box>
        </Box>

        {/* Video Info */}
        <VStack
          space="xs"
          bg="$white"
          p="$4"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
        >
          <Heading size="sm">{storyName}.mp4</Heading>
          <Text size="sm" color="$textLight500">
            1080p
          </Text>
        </VStack>

        {/* Controls */}
        <Box flex={1} justifyContent="flex-end" mb="$8">
          <Button
            size="xl"
            action="primary"
            onPress={handleExport}
            isDisabled={exporting}
          >
            {exporting && <Spinner color="$white" mr="$2" />}
            <ButtonText>
              {exporting ? "正在导出..." : "导出视频"}
            </ButtonText>
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}
