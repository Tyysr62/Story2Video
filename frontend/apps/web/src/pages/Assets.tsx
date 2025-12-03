import { useState } from "react";
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
  ScrollView,
  Badge,
  BadgeText,
} from "@story2video/ui";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { mockStories, StoryStatus } from "@story2video/core";

const Assets = () => {
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width: 767px)");

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

  // Mobile layout: Full width cards in a scrollable list
  if (isMobile) {
    return (
      <Box flex={1} bg="$backgroundLight0" p="$4">
        <VStack space="md" flex={1}>
          <VStack space="xs">
            <Heading size="lg">素材库</Heading>
            <Text size="sm" color="$textLight500">管理已经生成的故事。</Text>
          </VStack>

          {/* Search Bar */}
          <Input size="lg">
            <InputSlot pl="$3">
              <InputIcon as={SearchIcon} />
            </InputSlot>
            <InputField
              placeholder="搜索故事..."
              value={search}
              onChangeText={setSearch}
            />
          </Input>

          {/* List of Assets */}
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <VStack space="md" pb="$4">
              {filteredAssets.map((story) => {
                const statusInfo = getStatusBadge(story.status);
                return (
                  <Box
                    key={story.id}
                    bg="$white"
                    borderRadius="$lg"
                    borderWidth={1}
                    borderColor="$borderLight200"
                    overflow="hidden"
                    shadowColor="$black"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.1}
                    shadowRadius={4}
                    elevation={2}
                  >
                    <Image
                      source={{ uri: story.cover_url || `https://placehold.co/600x400/png?text=${encodeURIComponent(story.title)}` }}
                      alt={story.title}
                      h={150}
                      w="100%"
                      resizeMode="cover"
                    />
                    <VStack p="$3" space="xs">
                      <HStack justifyContent="space-between" alignItems="center">
                        <Heading size="sm" isTruncated flex={1}>{story.title}</Heading>
                        <Badge size="sm" variant="solid" borderRadius="$full" action={statusInfo.action}>
                          <BadgeText>{statusInfo.label}</BadgeText>
                        </Badge>
                      </HStack>
                      <Text size="xs" color="$textLight400">创建: {formatDate(story.created_at)}</Text>
                      <Text size="xs" color="$textLight500" numberOfLines={1}>{story.content}</Text>
                    </VStack>
                  </Box>
                );
              })}
            </VStack>
          </ScrollView>

          {filteredAssets.length === 0 && (
            <Box flex={1} justifyContent="center" alignItems="center" py="$10">
              <Text color="$textLight400">暂无素材。</Text>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  // Desktop layout: Grid of cards
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
            const statusInfo = getStatusBadge(story.status);
            return (
              <Box
                key={story.id}
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
                  source={{ uri: story.cover_url || `https://placehold.co/600x400/png?text=${encodeURIComponent(story.title)}` }}
                  alt={story.title}
                  h={160}
                  w="100%"
                  resizeMode="cover"
                />
                <VStack p="$4" space="xs">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Heading size="sm" isTruncated flex={1}>{story.title}</Heading>
                    <Badge size="sm" variant="solid" borderRadius="$full" action={statusInfo.action}>
                      <BadgeText>{statusInfo.label}</BadgeText>
                    </Badge>
                  </HStack>
                  <Text size="xs" color="$textLight400">创建: {formatDate(story.created_at)}</Text>
                  <Text size="xs" color="$textLight500" numberOfLines={1}>{story.content}</Text>
                </VStack>
              </Box>
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
