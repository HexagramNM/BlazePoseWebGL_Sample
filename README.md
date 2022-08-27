# BlazePoseWebGL_sample
[BlazePose](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)で背景マスクをした映像をWebGLのテクスチャとして流すサンプル

[こんな感じ](https://hexagramnm.github.io/BlazePoseWebGL_sample/index.html)に動きます。背景マスクされたWebカメラ映像が少し奥行き方向に傾いた状態で表示されます。

BodyPixがDeprecatedとなり、新しいポーズ推定用の学習モデルBlazePoseが公開されていたため、BlazePoseに代替したバージョンを作りました。
BodyPixよりも実行速度が早くなり、自動で背景セグメントの境界がぼかされるようになっているようです。

BlazePoseで背景を消した映像を非表示キャンバスに送り、そのキャンバスからWebGLのテクスチャを作成することで、WebGL上にも表示しています。
[このQiita記事](https://qiita.com/HexagramNM/items/b967dfd3733ecee1a084)で解説をしております。

WebGLでの行列計算に[minMatrix.js](https://wgld.org/d/library/l001.html)を使用しております。minMatrix.jsはライセンスについて完全にフリーだそうなので、このリポジトリ内のコードは自由に使用していただいて大丈夫です。
