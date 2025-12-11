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
import { Directory, File, Paths } from "expo-file-system";
import { fetch } from "expo/fetch";
import * as MediaLibrary from "expo-media-library";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { useColorScheme } from "@/hooks/use-color-scheme";

const FALLBACK_THUMBNAIL = "https://placehold.co/600x400/png?text=Video+Preview";

export default function PreviewScreen() {
  const { storyId = "" } = useLocalSearchParams<{ storyId?: string }>();
  const toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const pageBg = isDark ? "$backgroundDark950" : "$backgroundLight0";
  const cardBg = isDark ? "$backgroundDark900" : "$white";
  const cardBorder = isDark ? "$borderDark700" : "$borderLight200";
  const [exporting, setExporting] = useState(false);

  // 获取故事数据
  const { data: story, isLoading } = useStory(storyId);

  const videoUrl = story?.video_url;
  const thumbnailUrl = story?.cover_url || FALLBACK_THUMBNAIL;
  const storyName = story?.title || "我的故事视频";
  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = true;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player?.playing ?? false });

  const handleTogglePlayback = async () => {
    if (!videoUrl) {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="warning" variant="accent" nativeID={id}>
            <ToastTitle>暂无视频</ToastTitle>
            <ToastDescription>当前故事还没有可播放的视频。</ToastDescription>
          </Toast>
        ),
      });
      return;
    }

    if (!player) return;

    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="accent" nativeID={id}>
            <ToastTitle>播放失败</ToastTitle>
            <ToastDescription>无法播放视频，请稍后重试。</ToastDescription>
          </Toast>
        ),
      });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (!videoUrl) {
        throw new Error("暂无可导出的视频");
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error("请允许存储权限以保存到相册");
      }

      const safeName = `${storyName.replace(/[^a-zA-Z0-9-_]+/g, "_") || "story2video"}.mp4`;
      const cacheDir = new Directory(Paths.cache, "story2video");
      cacheDir.create();
      const targetFile = new File(cacheDir, safeName);

      const response = await fetch(videoUrl);
      const bytes = await response.bytes();
      await targetFile.write(bytes);

      const asset = await MediaLibrary.createAssetAsync(targetFile.uri);
      const albumName = "Story2Video";
      const existingAlbum = await MediaLibrary.getAlbumAsync(albumName);
      if (existingAlbum) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
      } else {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      }

      toast.show({
        placement: "top",
        render: ({ id }) => {
          return (
            <Toast action="success" variant="accent" nativeID={id}>
              <ToastTitle>成功</ToastTitle>
              <ToastDescription>已保存到相册</ToastDescription>
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
              <ToastDescription>{err instanceof Error ? err.message : "导出视频失败。"}</ToastDescription>
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
      <Box
        flex={1}
        bg={pageBg}
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="large" />
        <Text mt="$4">正在加载预览...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={pageBg} p="$4">
      <VStack flex={1} space="lg">
        {/* Header with back button */}
        <HStack alignItems="center" space="md" mt="$4">
          <Pressable
            onPress={() => {
              if (story?.id) {
                router.replace({ pathname: "/storyboard", params: { storyId: story.id } });
              } else {
                router.back();
              }
            }}
          >
            <Icon
              as={ArrowLeftIcon}
              size="xl"
              color={isDark ? "$textDark100" : "$textLight800"}
            />
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
          {videoUrl ? (
            <>
              <VideoView
                player={player}
                style={{ width: "100%", height: "100%" }}
                nativeControls
                fullscreenOptions={{ enable: true }}
                allowsPictureInPicture
              />

              <Box position="absolute">
                <RNPressable onPress={handleTogglePlayback}>
                  <FontAwesome
                    name={isPlaying ? "pause-circle" : "play-circle"}
                    size={64}
                    color="white"
                  />
                </RNPressable>
              </Box>
            </>
          ) : (
            <>
              <Image
                source={{ uri: thumbnailUrl }}
                alt="Video Thumbnail"
                w="100%"
                h="100%"
                resizeMode="cover"
              />
              <Box position="absolute" px="$4" py="$2" bg="$backgroundDark900" opacity={0.8} borderRadius="$md">
                <Text color="$textDark100">暂无可播放的视频</Text>
              </Box>
            </>
          )}
        </Box>

        {/* Video Info */}
        <VStack
          space="xs"
          bg={cardBg}
          p="$4"
          borderRadius="$lg"
          borderWidth={1}
          borderColor={cardBorder}
        >
          <Heading size="sm">{storyName}.mp4</Heading>
          <Text size="sm" color={isDark ? "$textDark300" : "$textLight500"}>
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
