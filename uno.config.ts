// unocss配置文件
import {defineConfig,presetWind3,presetIcons} from 'unocss';

export default defineConfig({
    presets:[
        presetWind3(),
        presetIcons({
            scale: 1.2,
            warn: true,
            extraProperties: {
                display: 'inline-block',
                'vertical-align': 'middle',
            },
        }),
    ]
});