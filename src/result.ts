type Result<TSuccess, TError> =
  | {ok: true; value: TSuccess}
  | {ok: false; error: TError}

export default Result
