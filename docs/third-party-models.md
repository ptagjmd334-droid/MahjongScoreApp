# Third-party model/runtime notices

## Mahjong-YOLO YOLO11n ONNX

M7 v78 diagnostic mode loads the following model at runtime:

- Project: `nikmomo/Mahjong-YOLO`
- Pinned revision: `28ffceed232ad95fd019c47a6c51ae7c78791a0e`
- Model: `models/nano/mahjong-yolon-best.onnx`
- Purpose here: diagnostic tile object bounding boxes only; it does not replace the app's existing classifier in v78.
- Upstream license: MIT

Copyright (c) 2024 Shin Zhang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE.

## ONNX Runtime Web

M7 v78 diagnostic mode loads `onnxruntime-web@1.22.0` from jsDelivr at runtime.
ONNX Runtime is an open-source Microsoft project licensed under the MIT License.

These dependencies are loaded only for the v78 YOLO diagnostic path. If they cannot be loaded,
the existing MahjongScoreApp crop/classification/manual-correction path remains available.
