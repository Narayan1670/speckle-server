'use strict'
const crypto = require('crypto')
const crs = require('crypto-random-string')
const bcrypt = require('bcrypt')

const knex = require('../knex')
const Streams = () => knex('streams')
const Branches = () => knex('branches')
const Objects = () => knex('objects')
const Closures = () => knex('object_children_closure')
const ApiTokens = () => knex('api_tokens')
const TokenScopes = () => knex('token_scopes')

module.exports = class ServerAPI {
  constructor({ streamId }) {
    this.streamId = streamId
    this.isSending = false
    this.buffer = []
  }

  async saveObject(obj) {
    if (!obj) throw new Error('Null object')

    if (!obj.id) {
      obj.id = crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex')
    }

    await this.createObject(this.streamId, obj)

    return obj.id
  }

  async createObject(streamId, object) {
    const insertionObject = this.prepInsertionObject(streamId, object)

    const closures = []
    const totalChildrenCountByDepth = {}
    if (object.__closure !== null) {
      for (const prop in object.__closure) {
        closures.push({
          streamId,
          parent: insertionObject.id,
          child: prop,
          minDepth: object.__closure[prop]
        })

        if (totalChildrenCountByDepth[object.__closure[prop].toString()])
          totalChildrenCountByDepth[object.__closure[prop].toString()]++
        else totalChildrenCountByDepth[object.__closure[prop].toString()] = 1
      }
    }

    delete insertionObject.__tree
    delete insertionObject.__closure

    insertionObject.totalChildrenCount = closures.length
    insertionObject.totalChildrenCountByDepth = JSON.stringify(
      totalChildrenCountByDepth
    )

    const q1 = Objects().insert(insertionObject).toString() + ' on conflict do nothing'
    await knex.raw(q1)

    if (closures.length > 0) {
      const q2 = `${Closures().insert(closures).toString()} on conflict do nothing`
      await knex.raw(q2)
    }

    return insertionObject.id
  }

  prepInsertionObject(streamId, obj) {
    const MAX_OBJECT_SIZE = 10 * 1024 * 1024

    if (obj.hash) obj.id = obj.hash
    else
      obj.id =
        obj.id || crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex') // generate a hash if none is present

    const stringifiedObj = JSON.stringify(obj)
    if (stringifiedObj.length > MAX_OBJECT_SIZE) {
      throw new Error(
        `Object too large (${stringifiedObj.length} > ${MAX_OBJECT_SIZE})`
      )
    }

    return {
      data: stringifiedObj, // stored in jsonb column
      streamId,
      id: obj.id,
      speckleType: obj.speckleType
    }
  }

  async getBranchByNameAndStreamId({ streamId, name }) {
    const query = Branches()
      .select('*')
      .where({ streamId })
      .andWhere(knex.raw('LOWER(name) = ?', [name]))
      .first()
    return await query
  }

  async createBranch({ name, description, streamId, authorId }) {
    const branch = {}
    branch.id = crs({ length: 10 })
    branch.streamId = streamId
    branch.authorId = authorId
    branch.name = name.toLowerCase()
    branch.description = description

    await Branches().returning('id').insert(branch)

    // update stream updated at
    await Streams().where({ id: streamId }).update({ updatedAt: knex.fn.now() })

    return branch.id
  }

  async createBareToken() {
    const tokenId = crs({ length: 10 })
    const tokenString = crs({ length: 32 })
    const tokenHash = await bcrypt.hash(tokenString, 10)
    const lastChars = tokenString.slice(tokenString.length - 6, tokenString.length)

    return { tokenId, tokenString, tokenHash, lastChars }
  }

  async createToken({ userId, name, scopes, lifespan }) {
    const { tokenId, tokenString, tokenHash, lastChars } = await this.createBareToken()

    if (scopes.length === 0) throw new Error('No scopes provided')

    const token = {
      id: tokenId,
      tokenDigest: tokenHash,
      lastChars,
      owner: userId,
      name,
      lifespan
    }
    const tokenScopes = scopes.map((scope) => ({ tokenId, scopeName: scope }))

    await ApiTokens().insert(token)
    await TokenScopes().insert(tokenScopes)

    return { id: tokenId, token: tokenId + tokenString }
  }

  async revokeTokenById(tokenId) {
    const delCount = await ApiTokens()
      .where({ id: tokenId.slice(0, 10) })
      .del()

    if (delCount === 0) throw new Error('Token revokation failed')
    return true
  }
}
