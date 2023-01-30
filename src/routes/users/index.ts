import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    return fastify.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;

      const user = await fastify.db.users.findOne({
        key: 'id',
        equals: id,
      });

      if (!user) {
        throw fastify.httpErrors.notFound(`User with id=${id} not found`);
      }

      return user;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      return fastify.db.users.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;

      try {
        const deletedUser = await fastify.db.users.delete(id);

        const deletedUserPosts = await fastify.db.posts.findMany({
          key: 'userId',
          equals: id,
        });

        deletedUserPosts.forEach(
          async (post) => await fastify.db.posts.delete(post.id)
        );

        const deletedUserProfiles = await fastify.db.profiles.findMany({
          key: 'userId',
          equals: id,
        });

        deletedUserProfiles.forEach(
          async (profile) => await fastify.db.profiles.delete(profile.id)
        );

        deletedUser.subscribedToUserIds = [];
        const usersDeletedUserSubscribedTo = await fastify.db.users.findMany({
          key: 'subscribedToUserIds',
          inArray: id,
        });
        usersDeletedUserSubscribedTo.forEach(async (user) => {
          user.subscribedToUserIds.splice(
            user.subscribedToUserIds.indexOf(deletedUser.id),
            1
          );
          await fastify.db.users.change(user.id, user);
        });

        return deletedUser;
      } catch (error) {
        throw fastify.httpErrors.badRequest(`User with id=${id} not found`);
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const { userId: userIdToSubscribeTo } = request.body;

      const user = await fastify.db.users.findOne({ key: 'id', equals: id });

      if (!user) {
        throw fastify.httpErrors.notFound(`User with id=${id} not found`);
      }

      const userToSubscribeTo = await fastify.db.users.findOne({
        key: 'id',
        equals: request.body.userId,
      });

      if (!userToSubscribeTo) {
        throw fastify.httpErrors.notFound(
          `User with id=${userIdToSubscribeTo} not found`
        );
      }

      if (
        userToSubscribeTo.subscribedToUserIds.includes(userToSubscribeTo.id)
      ) {
        throw fastify.httpErrors.badRequest(
          `User with id=${id} already subscribed to user with id=${userToSubscribeTo.id}`
        );
      }

      userToSubscribeTo.subscribedToUserIds.push(user.id);

      await fastify.db.users.change(userIdToSubscribeTo, userToSubscribeTo);
      return user;
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const user = await fastify.db.users.findOne({
        key: 'id',
        equals: request.params.id,
      });

      if (!user) {
        throw fastify.httpErrors.notFound('User not found');
      }

      const userToUnsubscribeFrom = await fastify.db.users.findOne({
        key: 'id',
        equals: request.body.userId,
      });

      if (!userToUnsubscribeFrom) {
        throw fastify.httpErrors.notFound('User to subscribe from not found');
      }

      if (!userToUnsubscribeFrom.subscribedToUserIds.includes(user.id)) {
        throw fastify.httpErrors.badRequest(
          `User with id=${user.id} not subscribed to user with id=${userToUnsubscribeFrom.id}`
        );
      }

      userToUnsubscribeFrom.subscribedToUserIds.splice(
        userToUnsubscribeFrom.subscribedToUserIds.findIndex(
          (userId) => userId === user.id
        ),
        1
      );

      await fastify.db.users.change(
        userToUnsubscribeFrom.id,
        userToUnsubscribeFrom
      );
      return user;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;

      try {
        const updatedUser = await fastify.db.users.change(id, request.body);
        return updatedUser;
      } catch (error) {
        throw fastify.httpErrors.badRequest(`User with id=${id} not found`);
      }
    }
  );
};

export default plugin;
