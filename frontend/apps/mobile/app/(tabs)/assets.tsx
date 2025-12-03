import React, { useState } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
} from "@story2video/ui";
import { mockStories, StoryStatus } from "@story2video/core";
import type { Story } from "@story2video/core";

export default function AssetsScreen() {
  const [search, setSearch] = useState("");

  // 使用 mockStories 作为数据源
  const filteredAssets = mockStories.filter((story) =>
    story.title.toLowerCase().includes(search.toLowerCase())
  );

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
  const getStatusBadge = (status: StoryStatus) => {
    switch (status) {
      case StoryStatus.READY:
        return { action: "success" as const, label: "已完成" };
      case StoryStatus.GENERATING:
        return { action: "info" as const, label: "生成中" };
      case StoryStatus.FAILED:
        return { action: "error" as const, label: "失败" };
      default:
        return { action: "muted" as const, label: status };
    }
  };

  const renderItem = ({ item: story }: { item: Story }) => {
    const statusInfo = getStatusBadge(story.status);
    return (
      <Box
        bg="$white"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$borderLight200"
        overflow="hidden"
        mb="$4"
      >
        <Image
          source={{ uri: story.cover_url || `https://placehold.co/600x400/png?text=${encodeURIComponent(story.title)}` }}
          alt={story.title}
          h={180}
          w="100%"
          resizeMode="cover"
        />
        <VStack p="$4" space="xs">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="sm" isTruncated flex={1}>
              {story.title}
            </Heading>
            <Badge size="sm" variant="solid" borderRadius="$full" action={statusInfo.action}>
              <BadgeText>{statusInfo.label}</BadgeText>
            </Badge>
          </HStack>
          <Text size="xs" color="$textLight400">
            创建: {formatDate(story.created_at)}
          </Text>
          <Text size="xs" color="$textLight500" numberOfLines={1}>
            {story.content}
          </Text>
        </VStack>
      </Box>
    );
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <VStack flex={1} space="md" p="$4">
          <Heading size="2xl">Assets Library</Heading>

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
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
