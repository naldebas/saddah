// src/modules/conversations/conversations.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * WebSocket events for conversations
 */
export const ConversationEvents = {
  // Server -> Client events
  NEW_CONVERSATION: 'conversation:new',
  NEW_MESSAGE: 'conversation:message',
  MESSAGE_STATUS: 'conversation:status',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_UPDATED: 'conversation:updated',
  TYPING_START: 'conversation:typing:start',
  TYPING_STOP: 'conversation:typing:stop',

  // Client -> Server events
  JOIN_TENANT: 'join:tenant',
  LEAVE_TENANT: 'leave:tenant',
  JOIN_CONVERSATION: 'join:conversation',
  LEAVE_CONVERSATION: 'leave:conversation',
  MARK_READ: 'mark:read',
  START_TYPING: 'typing:start',
  STOP_TYPING: 'typing:stop',
} as const;

/**
 * Payload types
 */
export interface NewConversationPayload {
  conversationId: string;
  channel: string;
  channelId: string;
  status: string;
  contactName?: string;
  createdAt: Date;
}

export interface NewMessagePayload {
  conversationId: string;
  messageId: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  type: string;
  content: string;
  mediaUrl?: string;
  timestamp: Date;
}

export interface MessageStatusPayload {
  conversationId: string;
  messageId: string;
  status: string;
  timestamp: Date;
}

export interface ConversationAssignedPayload {
  conversationId: string;
  assignedToId: string;
  assignedToName: string;
  assignedById?: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

@WebSocketGateway({
  namespace: '/conversations',
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
})
export class ConversationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationsGateway.name);
  private readonly connectedClients = new Map<string, { tenantId: string; userId: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Conversations WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const { sub: userId, tenantId } = payload;

      // Store client info
      this.connectedClients.set(client.id, { tenantId, userId });

      // Auto-join tenant room
      const tenantRoom = `tenant:${tenantId}`;
      client.join(tenantRoom);

      this.logger.log(
        `Client ${client.id} connected: user=${userId}, tenant=${tenantId}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        clientId: client.id,
        tenantId,
        userId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      this.logger.log(
        `Client ${client.id} disconnected: user=${clientInfo.userId}`,
      );
      this.connectedClients.delete(client.id);
    }
  }

  // ============================================
  // CLIENT -> SERVER MESSAGE HANDLERS
  // ============================================

  @SubscribeMessage(ConversationEvents.JOIN_CONVERSATION)
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined ${room}`);
    return { success: true };
  }

  @SubscribeMessage(ConversationEvents.LEAVE_CONVERSATION)
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left ${room}`);
    return { success: true };
  }

  @SubscribeMessage(ConversationEvents.START_TYPING)
  handleStartTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    const room = `conversation:${data.conversationId}`;
    client.to(room).emit(ConversationEvents.TYPING_START, {
      conversationId: data.conversationId,
      userId: clientInfo.userId,
    });
  }

  @SubscribeMessage(ConversationEvents.STOP_TYPING)
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    const room = `conversation:${data.conversationId}`;
    client.to(room).emit(ConversationEvents.TYPING_STOP, {
      conversationId: data.conversationId,
      userId: clientInfo.userId,
    });
  }

  // ============================================
  // SERVER -> CLIENT EMIT METHODS
  // ============================================

  /**
   * Emit new conversation event to tenant room
   */
  emitNewConversation(tenantId: string, payload: NewConversationPayload) {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit(ConversationEvents.NEW_CONVERSATION, payload);
    this.logger.debug(`Emitted new conversation to ${room}`);
  }

  /**
   * Emit new message to conversation room
   */
  emitNewMessage(tenantId: string, conversationId: string, payload: NewMessagePayload) {
    // Emit to tenant room (for list view)
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit(ConversationEvents.NEW_MESSAGE, payload);

    // Emit to conversation room (for detail view)
    const conversationRoom = `conversation:${conversationId}`;
    this.server.to(conversationRoom).emit(ConversationEvents.NEW_MESSAGE, payload);

    this.logger.debug(`Emitted new message to conversation ${conversationId}`);
  }

  /**
   * Emit message status update
   */
  emitMessageStatus(tenantId: string, conversationId: string, payload: MessageStatusPayload) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit(ConversationEvents.MESSAGE_STATUS, payload);

    const conversationRoom = `conversation:${conversationId}`;
    this.server.to(conversationRoom).emit(ConversationEvents.MESSAGE_STATUS, payload);
  }

  /**
   * Emit conversation assigned event
   */
  emitConversationAssigned(tenantId: string, payload: ConversationAssignedPayload) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit(ConversationEvents.CONVERSATION_ASSIGNED, payload);

    const conversationRoom = `conversation:${payload.conversationId}`;
    this.server.to(conversationRoom).emit(ConversationEvents.CONVERSATION_ASSIGNED, payload);
  }

  /**
   * Emit general conversation update
   */
  emitConversationUpdated(
    tenantId: string,
    conversationId: string,
    updates: Record<string, any>,
  ) {
    const tenantRoom = `tenant:${tenantId}`;
    this.server.to(tenantRoom).emit(ConversationEvents.CONVERSATION_UPDATED, {
      conversationId,
      ...updates,
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get count of connected clients for a tenant
   */
  async getConnectedClientsCount(tenantId: string): Promise<number> {
    const room = `tenant:${tenantId}`;
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    for (const [, clientInfo] of this.connectedClients) {
      if (clientInfo.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Send direct message to a specific user
   */
  sendToUser(userId: string, event: string, payload: any): boolean {
    for (const [clientId, clientInfo] of this.connectedClients) {
      if (clientInfo.userId === userId) {
        this.server.to(clientId).emit(event, payload);
        return true;
      }
    }
    return false;
  }
}
