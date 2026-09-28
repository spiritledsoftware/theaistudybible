import { Tiktoken } from 'js-tiktoken/lite';

let encoderPromise: Promise<Tiktoken> | undefined;

// Pure-JS tokenizer: the wasm `tiktoken` package relies on ESM wasm integration, which workerd lacks.
function getEncoder() {
  encoderPromise ??= import('js-tiktoken/ranks/cl100k_base').then(
    ({ default: ranks }) => new Tiktoken(ranks),
  );
  return encoderPromise;
}

export const numTokensFromString = async (options: { text: string }) => {
  const encoder = await getEncoder();
  return encoder.encode(options.text).length;
};
