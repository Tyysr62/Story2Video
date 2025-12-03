import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  ScrollView,
  Badge,
  BadgeText,
  Spinner,
  Button,
  ButtonText,
  Pressable,
} from "@story2video/ui";
import { Clock, CheckCircle, XCircle, Loader, Film, Image, Video } from "lucide-react";
import { mockOperations, OperationStatus, OperationType } from "@story2video/core";
import type { Operation } from "@story2video/core";

const Operations = () => {
  const navigate = useNavigate();
  const [operations] = useState<Operation[]>(mockOperations);
  const [filter, setFilter] = useState<OperationStatus | "all">("all");

  const filteredOperations = filter === "all" 
    ? operations 
    : operations.filter(op => op.status === filter);

  // 点击已完成的任务跳转到对应页面
  const handleOperationClick = (op: Operation) => {
    if (op.status !== OperationStatus.SUCCEEDED) return;
    
    switch (op.type) {
      case OperationType.STORY_CREATE:
        navigate(`/storyboard?storyId=${op.story_id}`);
        break;
      case OperationType.VIDEO_RENDER:
        navigate(`/preview?storyId=${op.story_id}`);
        break;
      case OperationType.SHOT_REGEN:
        navigate(`/shot/${op.shot_id}?storyId=${op.story_id}`);
        break;
    }
  };

  const getStatusBadge = (status: OperationStatus) => {
    switch (status) {
      case "succeeded":
        return { action: "success" as const, icon: CheckCircle, label: "成功" };
      case "failed":
        return { action: "error" as const, icon: XCircle, label: "失败" };
      case "running":
        return { action: "info" as const, icon: Loader, label: "运行中" };
      case "queued":
        return { action: "muted" as const, icon: Clock, label: "排队中" };
      default:
        return { action: "muted" as const, icon: Clock, label: status };
    }
  };

  const getTypeIcon = (type: OperationType) => {
    switch (type) {
      case "story_create":
        return Film;
      case "shot_regen":
        return Image;
      case "video_render":
        return Video;
      default:
        return Film;
    }
  };

  const getTypeLabel = (type: OperationType) => {
    switch (type) {
      case "story_create":
        return "创建故事";
      case "shot_regen":
        return "重新生成分镜";
      case "video_render":
        return "渲染视频";
      default:
        return type;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "-";
    const date = new Date(timeStr);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box flex={1} bg="$backgroundLight0" p="$8">
      <VStack space="lg" flex={1}>
        <VStack space="xs">
          <Heading size="2xl">任务列表</Heading>
          <Text size="sm" color="$textLight500">
            查看所有任务的执行状态和进度
          </Text>
        </VStack>

        {/* Filter Buttons */}
        <HStack space="sm" flexWrap="wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "solid" : "outline"}
            action={filter === "all" ? "primary" : "secondary"}
            onPress={() => setFilter("all")}
            className="rounded-full"
          >
            <ButtonText>全部</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.RUNNING ? "solid" : "outline"}
            action={filter === OperationStatus.RUNNING ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.RUNNING)}
            className="rounded-full"
          >
            <ButtonText>运行中</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.QUEUED ? "solid" : "outline"}
            action={filter === OperationStatus.QUEUED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.QUEUED)}
            className="rounded-full"
          >
            <ButtonText>排队中</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.SUCCEEDED ? "solid" : "outline"}
            action={filter === OperationStatus.SUCCEEDED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.SUCCEEDED)}
            className="rounded-full"
          >
            <ButtonText>已完成</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.FAILED ? "solid" : "outline"}
            action={filter === OperationStatus.FAILED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.FAILED)}
            className="rounded-full"
          >
            <ButtonText>失败</ButtonText>
          </Button>
        </HStack>

        {/* Operations List */}
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <VStack space="md" pb="$4">
            {filteredOperations.length === 0 ? (
              <Box p="$8" alignItems="center">
                <Text color="$textLight400">暂无任务</Text>
              </Box>
            ) : (
              filteredOperations.map((op) => {
                const statusInfo = getStatusBadge(op.status);
                const TypeIcon = getTypeIcon(op.type);
                const StatusIcon = statusInfo.icon;
                const isClickable = op.status === OperationStatus.SUCCEEDED;

                return (
                  <Pressable
                    key={op.id}
                    onPress={() => handleOperationClick(op)}
                    disabled={!isClickable}
                  >
                    <Box
                      bg="$white"
                      borderRadius="$xl"
                      borderColor="$borderLight200"
                      borderWidth={1}
                      p="$4"
                      shadowColor="$black"
                      shadowOffset={{ width: 0, height: 2 }}
                      shadowOpacity={0.08}
                      shadowRadius={4}
                      elevation={2}
                      className={isClickable ? "transition-all hover:shadow-lg hover:bg-gray-50" : ""}
                    >
                    <VStack space="sm">
                      {/* Header Row */}
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Box
                            w="$10"
                            h="$10"
                            bg="$backgroundLight100"
                            borderRadius="$lg"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <TypeIcon size={20} color="#666" />
                          </Box>
                          <VStack>
                            <Text fontWeight="$bold" size="md">
                              {getTypeLabel(op.type)}
                            </Text>
                            <Text size="xs" color="$textLight400">
                              ID: {op.id.slice(0, 8)}...
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge
                          size="md"
                          variant="solid"
                          borderRadius="$full"
                          action={statusInfo.action}
                        >
                          <HStack space="xs" alignItems="center" px="$2">
                            {op.status === "running" ? (
                              <Spinner size="small" color="$white" />
                            ) : (
                              <StatusIcon size={14} color="white" />
                            )}
                            <BadgeText>{statusInfo.label}</BadgeText>
                          </HStack>
                        </Badge>
                      </HStack>

                      {/* Payload Info */}
                      {op.payload && (
                        <Box bg="$backgroundLight50" p="$3" borderRadius="$md">
                          <Text size="sm" color="$textLight600" numberOfLines={2}>
                            {op.payload.display_name || op.payload.details || JSON.stringify(op.payload).slice(0, 100)}
                          </Text>
                        </Box>
                      )}

                      {/* Error Message */}
                      {op.status === "failed" && op.error_msg && (
                        <Box bg="$error50" p="$3" borderRadius="$md">
                          <Text size="sm" color="$error700" numberOfLines={3}>
                            {op.error_msg}
                          </Text>
                        </Box>
                      )}

                      {/* Time Info */}
                      <HStack justifyContent="space-between" flexWrap="wrap">
                        <HStack space="lg">
                          <VStack>
                            <Text size="xs" color="$textLight400">创建时间</Text>
                            <Text size="sm">{formatTime(op.created_at)}</Text>
                          </VStack>
                          {op.started_at && (
                            <VStack>
                              <Text size="xs" color="$textLight400">开始时间</Text>
                              <Text size="sm">{formatTime(op.started_at)}</Text>
                            </VStack>
                          )}
                          {op.finished_at && (
                            <VStack>
                              <Text size="xs" color="$textLight400">完成时间</Text>
                              <Text size="sm">{formatTime(op.finished_at)}</Text>
                            </VStack>
                          )}
                        </HStack>
                        {op.worker && (
                          <Text size="xs" color="$textLight400" alignSelf="flex-end">
                            执行节点: {op.worker}
                          </Text>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
                  </Pressable>
                );
              })
            )}
          </VStack>
        </ScrollView>
      </VStack>
    </Box>
  );
};

export default Operations;
