import React, { useState, useMemo, useCallback } from "react";
import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
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
  Pressable,
} from "@story2video/ui";
import { useStories } from "@story2video/core";
import type { StoryListItem } from "@story2video/core";

export default function AssetsScreen() {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // 使用 useStories hook 获取真实数据
  const { data: storiesData, isLoading, error, refetch } = useStories();
  const stories = storiesData?.items ?? [];

  // 下拉刷新处理
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // 根据搜索过滤
  const filteredAssets = useMemo(() => {
    return stories.filter((story) =>
      (story.display_name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }, [stories, search]);

  // 处理点击素材项目：根据 video_url 是否为空决定跳转页面
  const handleAssetClick = useCallback((story: StoryListItem) => {
    if (story.video_url) {
      // 有视频，跳转到预览页面
      router.push({ pathname: "/preview", params: { storyId: story.story_id } });
    } else {
      // 无视频，跳转到分镜编辑页面
      router.push({ pathname: "/storyboard", params: { storyId: story.story_id } });
    }
  }, []);

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

  const renderItem = ({ item: story }: { item: StoryListItem }) => {
    const statusInfo = getStatusBadge(story.compile_state);
    return (
      <Pressable onPress={() => handleAssetClick(story)}>
        <Box
          bg="$white"
          borderRadius="$lg"
          borderWidth={1}
          borderColor="$borderLight200"
          overflow="hidden"
          mb="$4"
        >
          <Image
            source={{ uri: story.cover_url || `https://placehold.co/600x400/png?text=${encodeURIComponent(story.display_name ?? "故事")}` }}
            alt={story.display_name}
            h={180}
            w="100%"
            resizeMode="cover"
          />
          <VStack p="$4" space="xs">
            <HStack justifyContent="space-between" alignItems="center">
              <Heading size="sm" isTruncated flex={1}>
                {story.display_name}
              </Heading>
              <Badge size="sm" variant="solid" borderRadius="$full" action={statusInfo.action}>
                <BadgeText>{statusInfo.label}</BadgeText>
              </Badge>
            </HStack>
            <Text size="xs" color="$textLight400">
              创建: {formatDate(story.create_time)}
            </Text>
          </VStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack flex={1} space="md" p="$4">
          <Heading size="2xl">Assets Library</Heading>

          {isLoading ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Spinner size="large" />
              <Text mt="$2" color="$textLight500">加载中...</Text>
            </Box>
          ) : error ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text color="$error500">加载失败: {error.message}</Text>
            </Box>
          ) : (
            <>
              <Box>
                <Input size="xl">
                  <InputSlot pl="$3">
                    <InputIcon as={SearchIcon} />
                  </InputSlot>
                  <InputField
                    placeholder="Search assets..."
                    value={search}
                    onChangeText={setSearch}
                  />
                </Input>
              </Box>

              {filteredAssets.length === 0 ? (
                <Box flex={1} justifyContent="center" alignItems="center">
                  <Text color="$textLight400">No assets found.</Text>
                </Box>
              ) : (
                <FlatList
                  data={filteredAssets}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.story_id}
                  contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                />
              )}
            </>
          )}
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
