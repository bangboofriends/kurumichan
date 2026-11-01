export const urlParamSolver = {
    getSepParaArr(url: string): Record<string, string> {
        const result: Record<string, string> = {};

        // 1. 去掉 hash（# 之后不算参数）
        const hashIndex = url.indexOf("#");
        const cleanUrl = hashIndex === -1 ? url : url.slice(0, hashIndex);

        // 2. 取 ? 之后的部分
        const queryIndex = cleanUrl.indexOf("?");
        if (queryIndex === -1) return result;

        const queryStr = cleanUrl.slice(queryIndex + 1);
        if (!queryStr) return result;

        // 3. 按 & 分割，再按第一个 = 分割
        queryStr.split("&").forEach((pair) => {
            if (!pair) return;

            const eqIndex = pair.indexOf("=");
            if (eqIndex === -1) {
                // 只有 key 没有 value 的情况，如 ?flag
                result[decodeURIComponent(pair)] = "";
            } else {
                const key = decodeURIComponent(pair.slice(0, eqIndex));
                result[key] = decodeURIComponent(pair.slice(eqIndex + 1));
            }
        });

        return result;
    },
};