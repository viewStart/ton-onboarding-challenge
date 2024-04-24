import {Address,TonClient,toNano} from "ton"
import {getHttpEndpoint} from "@orbs-network/ton-access";
import {BN} from 'bn.js'
import {unixNow} from "./src/lib/utils";
import {MineMessageParams, Queries} from "./src/giver/NftGiver.data";

async function main () {

  const wallet = Address.parse('UQApDzFxqPRy2Pggyo23PaObM13UCs5hHO5OO1tTFrr_UcvN');
  const collection = Address.parse('EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX');

    // 获取在测试网中的去中心化 RPC 端点
    const endpoint = await getHttpEndpoint();
    
      // 初始化 ton 库
      const client = new TonClient({ endpoint });

      const miningData = await client.callGetMethod(collection, 'get_mining_data')

      console.log(miningData)

      const parseStackNum = (sn: any) => new BN(sn[1].substring(2), 'hex');

  const complexity = parseStackNum(miningData.stack[0]);
  const last_success = parseStackNum(miningData.stack[1]);
  const seed = parseStackNum(miningData.stack[2]);
  const target_delta = parseStackNum(miningData.stack[3]);
  const min_cpl = parseStackNum(miningData.stack[4]);
  const max_cpl = parseStackNum(miningData.stack[5]);

  console.log('complexity', complexity);
  console.log('last_success', last_success.toString());
  console.log('seed', seed);
  console.log('target_delta', target_delta.toString());
  console.log('min_cpl', min_cpl.toString());
  console.log('max_cpl', max_cpl.toString());

  const mineParams : MineMessageParams = {
    expire: unixNow() + 300, // 5分钟足以进行交易
    mintTo: wallet, // 你的钱包
    data1: new BN(0), // 用于矿工中递增的临时变量
    seed // 从get_mining_data获得的唯一seed
  };

  let msg = Queries.mine(mineParams);
  let progress = 0;

  while (new BN(msg.hash(), 'be').gt(complexity)) {
    progress += 1
    console.clear()
    console.log(`挖矿开始：请等待30-60秒以挖掘您的NFT！`)
    console.log(' ')
    console.log(`⛏ 已挖掘 ${progress} 个哈希！最新的：`, new BN(msg.hash(), 'be').toString())

    mineParams.expire = unixNow() + 300
    mineParams.data1.iaddn(1)
    msg = Queries.mine(mineParams)
  }

  console.log(' ')
  console.log('💎 任务完成：找到小于pow_complexity的msg_hash了！');
  console.log(' ')
  console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
  console.log('pow_complexity: ', complexity.toString())
  console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity))


  console.log(' ');
  console.log("💣 警告！一旦您找到哈希，您应该迅速发送交易。");
  console.log("如果其他人在您之前发送交易，seed会改变，您将不得不重新找到哈希！");
  console.log(' ');

  // flags只在用户友好的地址形式中有效
  const collectionAddr = collection.toFriendly({
    urlSafe: true,
    bounceable: true,
  })
  // 我们必须将TON转换为nanoTON
  const amountToSend = toNano('0.05').toString()
 // 这里的BOC表示cell包
  const preparedBodyCell = msg.toBoc().toString('base64url')

  // 最终构建支付URL的方法
  const tonDeepLink = (address: string, amount: string, body: string) => {
    return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
  };

  const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell);

  console.log('🚀 领取NFT的链接：')
  console.log(link);

  const qrcode = require('qrcode-terminal');

  qrcode.generate(link, {small: true}, function (qrcode : any) {
    console.log('🚀 用Tonkeeper挖掘NFT的链接（在测试网模式下使用）：')
    console.log(qrcode);
    console.log('* 如果二维码仍然太大，请在终端运行脚本。（或者缩小字体）')
  });
}

main()
// write your NFT miner here
