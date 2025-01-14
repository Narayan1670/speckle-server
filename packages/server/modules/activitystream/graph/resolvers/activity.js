'use strict'
const { md5 } = require('@/modules/shared/helpers/cryptoHelper')
const {
  getUserActivity,
  getStreamActivity,
  getResourceActivity,
  getUserTimeline,
  getActivityCountByResourceId,
  getActivityCountByStreamId,
  getActivityCountByUserId,
  getTimelineCount
} = require('../../services/index')

module.exports = {
  Query: {},
  User: {
    async activity(parent, args) {
      const { items, cursor } = await getUserActivity({
        userId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before,
        cursor: args.cursor,
        limit: args.limit
      })
      const totalCount = await getActivityCountByUserId({
        userId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before
      })

      return { items, cursor, totalCount }
    },

    async timeline(parent, args) {
      const { items, cursor } = await getUserTimeline({
        userId: parent.id,
        after: args.after,
        before: args.before,
        cursor: args.cursor,
        limit: args.limit
      })
      const totalCount = await getTimelineCount({
        userId: parent.id,
        after: args.after,
        before: args.before
      })

      return { items, cursor, totalCount }
    }
  },

  Stream: {
    async activity(parent, args) {
      const { items, cursor } = await getStreamActivity({
        streamId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before,
        cursor: args.cursor,
        limit: args.limit
      })
      const totalCount = await getActivityCountByStreamId({
        streamId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before
      })

      return { items, cursor, totalCount }
    }
  },

  Branch: {
    async activity(parent, args) {
      const { items, cursor } = await getResourceActivity({
        resourceType: 'branch',
        resourceId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before,
        cursor: args.cursor,
        limit: args.limit
      })
      const totalCount = await getActivityCountByResourceId({
        resourceId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before
      })

      return { items, cursor, totalCount }
    }
  },

  Commit: {
    async activity(parent, args) {
      const { items, cursor } = await getResourceActivity({
        resourceType: 'commit',
        resourceId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before,
        cursor: args.cursor,
        limit: args.limit
      })
      const totalCount = await getActivityCountByResourceId({
        resourceId: parent.id,
        actionType: args.actionType,
        after: args.after,
        before: args.before
      })

      return { items, cursor, totalCount }
    }
  },

  Activity: {
    /**
     * We need a unique ID to be able to properly cache stuff on the clientside
     */
    id(parent) {
      if (!parent) return null
      const { streamId, resourceId, userId, time } = parent
      const plainIdentity = JSON.stringify({
        streamId,
        resourceId,
        userId,
        time
      })

      return md5(plainIdentity)
    }
  }
}
