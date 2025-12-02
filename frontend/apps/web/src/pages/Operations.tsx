import { useState } from "react";
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
} from "@story2video/ui";
import { Clock, CheckCircle, XCircle, Loader, Film, Image, Video } from "lucide-react";
import { mockOperations, OperationStatus, OperationType } from "@story2video/core";
import type { Operation } from "@story2video/core";

const Operations = () => {
  const [operations] = useState<Operation[]>(mockOperations);
  const [filter, setFilter] = useState<OperationStatus | "all">("all");

  const filteredOperations = filter === "all" 
    ? operations 
    : operations.filter(op => op.status === filter);

  const getStatusBadge = (status: OperationStatus) => {
    switch (status) {
      case OperationStatus.SUCCEEDED:
        return { action: "success" as const, icon: CheckCircle, label: "成功" };
      case OperationStatus.FAILED:
        return { action: "error" as const, icon: XCircle, label: "失败" };
      case OperationStatus.RUNNING:
        return { action: "info" as const, icon: Loader, label: "运行中" };
      case OperationStatus.QUEUED:
        return { action: "muted" as const, icon: Clock, label: "排队中" };
      default:
        return { action: "muted" as const, icon: Clock, label: status };
    }
  };

  const getTypeIcon = (type: OperationType) => {
    switch (type) {
      case OperationType.STORY_CREATE:
        return Film;
      case OperationType.SHOT_REGEN:
        return Image;
      case OperationType.VIDEO_RENDER:
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
    <Box flex={1} bg="$backgroundLight0" p="$6">
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
          >
            <ButtonText>全部</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.RUNNING ? "solid" : "outline"}
            action={filter === OperationStatus.RUNNING ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.RUNNING)}
          >
            <ButtonText>运行中</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.QUEUED ? "solid" : "outline"}
            action={filter === OperationStatus.QUEUED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.QUEUED)}
          >
            <ButtonText>排队中</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.SUCCEEDED ? "solid" : "outline"}
            action={filter === OperationStatus.SUCCEEDED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.SUCCEEDED)}
          >
            <ButtonText>已完成</ButtonText>
          </Button>
          <Button
            size="sm"
            variant={filter === OperationStatus.FAILED ? "solid" : "outline"}
            action={filter === OperationStatus.FAILED ? "primary" : "secondary"}
            onPress={() => setFilter(OperationStatus.FAILED)}
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

                return (
                  <Box
                    key={op.id}
                    bg="$white"
                    borderRadius="$lg"
                    borderColor="$borderLight200"
                    borderWidth={1}
                    p="$4"
                    shadowColor="$black"
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.05}
                    shadowRadius={2}
                    elevation={1}
                  >
                    <VStack space="sm">
                      {/* Header Row */}
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Box
                            w="$8"
                            h="$8"
                            bg="$backgroundLight100"
                            borderRadius="$md"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <TypeIcon size={16} color="#666" />
                          </Box>
                          <VStack>
                            <Text fontWeight="$bold" size="sm">
                              {getTypeLabel(op.type)}
                            </Text>
                            <Text size="xs" color="$textLight400">
                              {op.id.slice(0, 8)}...
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge
                          size="sm"
                          variant="solid"
                          borderRadius="$full"
                          action={statusInfo.action}
                        >
                          <HStack space="xs" alignItems="center" px="$1">
                            {op.status === "running" ? (
                              <Spinner size="small" color="$white" />
                            ) : (
                              <StatusIcon size={12} color="white" />
                            )}
                            <BadgeText>{statusInfo.label}</BadgeText>
                          </HStack>
                        </Badge>
                      </HStack>

                      {/* Payload Info */}
                      {op.payload && (
                        <Box bg="$backgroundLight50" p="$2" borderRadius="$sm">
                          <Text size="xs" color="$textLight600" numberOfLines={2}>
                            {op.payload.display_name || op.payload.details || JSON.stringify(op.payload).slice(0, 100)}
                          </Text>
                        </Box>
                      )}

                      {/* Error Message */}
                      {op.status === "failed" && op.error_msg && (
                        <Box bg="$error50" p="$2" borderRadius="$sm">
                          <Text size="xs" color="$error700" numberOfLines={2}>
                            {op.error_msg}
                          </Text>
                        </Box>
                      )}

                      {/* Time Info */}
                      <HStack justifyContent="space-between">
                        <HStack space="md">
                          <VStack>
                            <Text size="xs" color="$textLight400">创建时间</Text>
                            <Text size="xs">{formatTime(op.created_at)}</Text>
                          </VStack>
                          {op.started_at && (
                            <VStack>
                              <Text size="xs" color="$textLight400">开始时间</Text>
                              <Text size="xs">{formatTime(op.started_at)}</Text>
                            </VStack>
                          )}
                          {op.finished_at && (
                            <VStack>
                              <Text size="xs" color="$textLight400">完成时间</Text>
                              <Text size="xs">{formatTime(op.finished_at)}</Text>
                            </VStack>
                          )}
                        </HStack>
                        {op.worker && (
                          <Text size="xs" color="$textLight400">
                            Worker: {op.worker}
                          </Text>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
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
