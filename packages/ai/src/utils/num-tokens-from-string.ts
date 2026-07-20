import { Tiktoken } from 'tiktoken/lite';
import { load } from 'tiktoken/lite/load';

export const numTokensFromString = async (options: {
  model?: string;
  encoding?: Tiktoken;
  text: string;
}) => {
  let encoding = options.encoding;
  if (!encoding && options.model) {
    const { default: registry } = await import('tiktoken/registry.json');
    const { default: models } = await import('tiktoken/model_to_encoding.json');
    // @ts-expect-error
    const registryModel = registry[models[options.model]];
    if (registryModel) {
      const model = await load(registryModel);
      encoding = new Tiktoken(model.bpe_ranks, model.special_tokens, model.pat_str);
    }
  }

  if (!encoding) {
    const cl100k_base = await import('tiktoken/encoders/cl100k_base.json');
    encoding = new Tiktoken(cl100k_base.bpe_ranks, cl100k_base.special_tokens, cl100k_base.pat_str);
  }

  const length = encoding.encode(options.text).length;
  encoding.free();
  return length;
};
