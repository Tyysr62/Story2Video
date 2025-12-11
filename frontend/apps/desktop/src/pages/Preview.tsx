import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Heading,
  Button,
  ButtonText,
  VStack,
  HStack,
  Text,
  Icon,
  ArrowLeftIcon,
  useToast,
  Toast,
  ToastTitle,
  ToastDescription,
  Spinner,
} from "@story2video/ui";
import { useStory } from "@story2video/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// Fallback mock video URL
const FALLBACK_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

const Preview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get("storyId") || "";
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [exporting, setExporting] = useState(false);

  // 获取故事数据
  const { data: story, isLoading } = useStory(storyId);

  const videoUrl = story?.video_url || FALLBACK_VIDEO_URL;
  const storyName = story?.title || "我的故事视频";

  const handleExport = async () => {
    setExporting(true);
    try {
      if (!story?.video_url) {
        throw new Error("暂无可导出的视频");
      }

      const safeName = `${storyName.replace(/[^a-zA-Z0-9-_]+/g, "_") || "story2video"}.mp4`;
      const targetPath = await save({
        filters: [{ name: "Video", extensions: ["mp4"] }],
        defaultPath: safeName,
      });

      // 用户取消保存
      if (!targetPath) {
        setExporting(false);
        return;
      }

      const response = await tauriFetch(videoUrl, {
        // Ensure we download the file; plugin-http bypasses CORS
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      await writeFile(targetPath, new Uint8Array(buffer));

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
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text mt="$4">正在加载预览...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" p="$4">
      {/* Header */}
      <HStack
        alignItems="center"
        pb="$4"
        borderBottomWidth={1}
        borderColor="$borderLight200"
        mb="$4"
        space="md"
      >
        <Button
          variant="link"
          onPress={() => navigate(`/storyboard?storyId=${storyId}`)}
          p="$0"
        >
          <Icon as={ArrowLeftIcon} size="xl" color="$textLight800" />
        </Button>
        <Heading size="xl">视频预览</Heading>
      </HStack>

      {/* Main Content */}
      <VStack flex={1} space="lg" justifyContent="center" alignItems="center">
        <Box
          w="100%"
          maxWidth={1024}
          aspectRatio={16 / 9}
          bg="$black"
          borderRadius="$xl"
          overflow="hidden"
          shadowColor="$black"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
          shadowRadius={8}
          elevation={5}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            style={{ width: "100%", height: "100%", outline: "none" }}
            poster={
              story?.cover_url ||
              "https://placehold.co/1024x576/png?text=%E8%A7%86%E9%A2%91%E9%A2%84%E8%A7%88"
            }
          >
            您的浏览器不支持视频播放。
          </video>
        </Box>

        {/* Controls / Actions Area */}
        <HStack
          w="100%"
          maxWidth={1024}
          justifyContent="space-between"
          alignItems="center"
          p="$4"
          bg="$white"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
          shadowColor="$black"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={0.05}
          shadowRadius={2}
          elevation={1}
        >
          <VStack>
            <Heading size="sm">{storyName}.mp4</Heading>
            <Text size="sm" color="$textLight500">1080p</Text>
          </VStack>

          <Button
            size="lg"
            action="primary"
            onPress={handleExport}
            isDisabled={exporting}
          >
            {exporting && <Spinner color="$white" mr="$2" />}
            <ButtonText>{exporting ? "正在导出..." : "导出视频"}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default Preview;
