import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Input,
  InputField,
  InputSlot,
  InputIcon,
  SearchIcon,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  BadgeText,
  Spinner,
  Button,
  ButtonText,
  Pressable,
} from "@story2video/ui";
import { useStories, StoryListItem } from "@story2video/core";

const Assets = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // 使用 useStories hook 获取真实数据
  const { data: storiesData, isLoading, error, refetch } = useStories();

  // 处理点击素材项目：根据 video_url 是否为空决定跳转页面
  const handleAssetClick = useCallback((story: StoryListItem) => {
    if (story.video_url) {
      // 有视频，跳转到预览页面
      navigate(`/preview?storyId=${story.story_id}`);
    } else {
      // 无视频，跳转到分镜编辑页面
      navigate(`/storyboard?storyId=${story.story_id}`);
    }
  }, [navigate]);
  const stories = storiesData?.items ?? [];

  // 根据搜索过滤
  const filteredAssets = useMemo(() => {
    return stories.filter((story) =>
      (story.display_name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }, [stories, search]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 获取状态 Badge
  const getStatusBadge = (compileState: string) => {
    switch (compileState) {
      case "STATE_COMPLETED":
        return { action: "success" as const, label: "已完成" };
      case "STATE_RUNNING":
        return { action: "info" as const, label: "生成中" };
      case "STATE_FAILED":
        return { action: "error" as const, label: "失败" };
      default:
        return { action: "muted" as const, label: "草稿" };
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text mt="$4" color="$textLight400">加载中...</Text>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flex={1} bg="$backgroundLight0" justifyContent="center" alignItems="center" p="$4">
        <Text color="$error500" mb="$4">加载素材库失败</Text>
        <Button onPress={() => refetch()}>
          <ButtonText>重试</ButtonText>
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$backgroundLight0" p="$8">
      <VStack space="xl">
        <VStack space="sm">
          <Heading size="2xl">素材库</Heading>
          <Text color="$textLight500">管理已经生成的故事与视频。</Text>
        </VStack>

        {/* Search Bar */}
        <Box maxWidth={500}>
            <Input size="xl">
                <InputSlot pl="$3">
                    <InputIcon as={SearchIcon} />
                </InputSlot>
                <InputField
                placeholder="按故事名称搜索..."
                    value={search}
                    onChangeText={setSearch}
                />
            </Input>
        </Box>

        {/* Grid of Assets */}
        <HStack space="md" flexWrap="wrap">
            {filteredAssets.map((story) => {
                const statusInfo = getStatusBadge(story.compile_state);
                return (
                    <Pressable key={story.story_id} onPress={() => handleAssetClick(story)}>
                        <Box
                            width={300}
                            bg="$white"
                            borderRadius="$lg"
                            borderWidth={1}
                            borderColor="$borderLight200"
                            overflow="hidden"
                            mb="$4"
                            shadowColor="$black"
                            shadowOffset={{ width: 0, height: 2 }}
                            shadowOpacity={0.1}
                            shadowRadius={4}
                            elevation={2}
                        >
                            <Image
                                source={{ uri: story.cover_url || `https://placehold.co/600x400/png?text=${encodeURIComponent(story.display_name ?? "故事")}` }}
                                alt={story.display_name}
                                h={160}
                                w="100%"
                                resizeMode="cover"
                            />
                            <VStack p="$4" space="xs">
                                <HStack justifyContent="space-between" alignItems="center">
                                    <Heading size="sm" isTruncated flex={1}>{story.display_name}</Heading>
                                    <Badge size="sm" variant="solid" borderRadius="$full" action={statusInfo.action}>
                                        <BadgeText>{statusInfo.label}</BadgeText>
                                    </Badge>
                                </HStack>
                                <Text size="xs" color="$textLight400">创建时间: {formatDate(story.create_time)}</Text>
                            </VStack>
                        </Box>
                    </Pressable>
                );
            })}
        </HStack>

          {filteredAssets.length === 0 && (
             <Box flex={1} justifyContent="center" alignItems="center" py="$10">
               <Text color="$textLight400">暂无素材。</Text>
             </Box>
          )}
      </VStack>
    </Box>
  );
};

export default Assets;
