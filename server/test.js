const BlockChain = require('./app')
import uid from 'uid';
const bitcoin = new BlockChain()

bitcoin.createNewBlock(2389, uid(15).toUpperCase(), uid(15).toUpperCase())

bitcoin.createNewTransaction(100, uid(15).toUpperCase(), uid(15).toUpperCase())

bitcoin.createNewBlock(4353, uid(15).toUpperCase(), uid(15).toUpperCase())

bitcoin.createNewTransaction(20, uid(15).toUpperCase(), uid(15).toUpperCase())
bitcoin.createNewTransaction(30, uid(15).toUpperCase(), uid(15).toUpperCase())
bitcoin.createNewTransaction(40, uid(15).toUpperCase(), uid(15).toUpperCase())

console.log(bitcoin);
