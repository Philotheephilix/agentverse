import { spawn } from 'child_process';
import path from 'path';

/**
 * Calls the browserTestingAi.py script and returns the live URL immediately, then the final result when available.
 * @param {object} params - { input: string }
 * @returns {Promise<{ liveUrl: string, finalResult: string }>} URLs and result
 */
export async function browserTestingAiTool(params: { input: string, topicId?: string }): Promise<{ liveUrl: string, finalResult: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../browserUse/browserTestingAi.py');
    const args = [scriptPath, params.input];
    if (params.topicId) args.push(params.topicId);
    const pyProcess = spawn('python3', args);
    let liveUrl = '';
    let finalResult = '';
    let urlSent = false;
    pyProcess.stdout.on('data', async (data) => {
      const output = data.toString();
      // Assume the Python script prints the live URL as a line starting with 'LIVE_URL:'
      if (output.includes('LIVE_URL:')) {
        liveUrl = output.match(/LIVE_URL:(\S+)/)?.[1] || '';
        if (liveUrl && !urlSent) {
          urlSent = true;
          if (params.topicId) {
            try {
              const submit = require('../tools/topic/submit/index');
              await submit.func({ topicId: params.topicId, message: `LIVE_URL: ${liveUrl}` });
            } catch (err) {
              console.error('[browserTestingAiTool] Error submitting LIVE_URL to topic:', err);
            }
          }
        }
      }
      // Assume the Python script prints the final result as a line starting with 'FINAL_RESULT:'
      if (output.includes('FINAL_RESULT:')) {
        finalResult = output.split('FINAL_RESULT:')[1].trim();
      }
    });
    pyProcess.stderr.on('data', (data) => {
      console.error(`[browserTestingAiTool] stderr:`, data.toString());
    });
    pyProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`browserTestingAi.py exited with code ${code}`));
      } else {
        if (params.topicId && finalResult) {
          try {
            const submit = require('../tools/topic/submit/index');
            await submit.func({ topicId: params.topicId, message: `FINAL_RESULT: ${finalResult}` });
            await submit.func({ topicId: params.topicId, message: `An NFT is being minted for your transaction.` });
            // Call NFT minting tool
            const mintNft = require('../tools/mintNft/index');
            // Use dummy params for now; replace with real values as needed
            const nftParams = {
              tokenName: 'BookingNFT',
              tokenSymbol: 'BNFT',
              maxSupply: 1,
              metadata: Buffer.from(`Booking result: ${finalResult}`).toString('base64'),
            };
            const mintResult = await mintNft.func(nftParams);
            await submit.func({ topicId: params.topicId, message: `NFT Mint Result: ${mintResult}` });
          } catch (err) {
            console.error('[browserTestingAiTool] Error submitting FINAL_RESULT/NFT to topic:', err);
          }
        }
        resolve({ liveUrl, finalResult });
      }
    });
  });
}

module.exports = {
  name: 'browser_testing_ai',
  description: 'Calls browserTestingAi.py, returns the live URL first and then the final result.',
  func: browserTestingAiTool,
  schema: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input string for the browserTestingAi.py tool' }
    },
    required: ['input']
  }
};
