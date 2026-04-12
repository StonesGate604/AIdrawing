"""
# Drawing AI - PyTorch Training Script
# =====================================
# 目标：给模型看一张画布截图，让它预测下一笔的起点坐标和颜色

# 使用方法（在Colab或本地）：
#   pip install torch torchvision pillow
#   python train.py --data_dir ./your_session_folder

# 数据格式期望：
#   session_0/
#     step_0000.png
#     step_0000.json
#     step_0001.png
#     step_0001.json
#     ...
# """

import os
import json
import argparse
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image


# ==========================================
# 1. Dataset：读取你录制的数据
# ==========================================

class DrawingDataset(Dataset):
    def __init__(self, data_dir, img_size=128):
        """
        data_dir: 包含 step_XXXX.png 和 step_XXXX.json 的文件夹
        img_size: 把截图缩放到这个尺寸
        """
        self.samples = []
        self.img_size = img_size

        # 图片预处理：缩放 + 转tensor + 归一化到[-1,1]
        self.transform = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])  # 灰度图
        ])

        # 扫描所有session文件夹
        if os.path.isdir(data_dir):
            self._load_session(data_dir)

        print(f"Loaded {len(self.samples)} samples")

    def _load_session(self, session_dir):
        """读取一个session里的所有步骤"""
        json_files = sorted([
            f for f in os.listdir(session_dir)
            if f.endswith('.json') and f.startswith('step_')
        ])

        for json_file in json_files:
            json_path = os.path.join(session_dir, json_file)
            png_path = json_path.replace('.json', '.png')

            if not os.path.exists(png_path):
                continue

            with open(json_path, 'r') as f:
                data = json.load(f)

            action = data.get('action', {})

            # 只处理stroke_end类型（有points数组的）
            if action.get('type') != 'stroke_end':
                continue

            points = action.get('points', [])
            if len(points) < 2:
                continue

            # 提取第一个点作为"这一笔从哪里开始"的标签
            first_point = points[0]
            x = float(first_point['x'])  # 0~1
            y = float(first_point['y'])  # 0~1

            # 颜色处理：把hex转成RGB三个0~1的值
            color_hex = action.get('color', '#000000')
            r, g, b = hex_to_rgb_normalized(color_hex)

            self.samples.append({
                'image_path': png_path,
                'label': [x, y, r, g, b]  # 5个值：坐标(2) + 颜色(3)
            })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]

        # 读取截图，转灰度（简化模型输入）
        img = Image.open(sample['image_path']).convert('L')
        img_tensor = self.transform(img)

        # 标签转tensor
        label = torch.tensor(sample['label'], dtype=torch.float32)

        return img_tensor, label


def hex_to_rgb_normalized(hex_color):
    """把 #ff4444 转成 (1.0, 0.267, 0.267)"""
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    return r, g, b


# ==========================================
# 2. Model：CNN + MLP
# ==========================================

class DrawingModel(nn.Module):
    def __init__(self, img_size=128):
        super(DrawingModel, self).__init__()

        # CNN部分：从画布截图里提取特征
        # 输入：1通道灰度图，128x128
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),  # 128x128x16
            nn.ReLU(),
            nn.MaxPool2d(2),                              # 64x64x16

            nn.Conv2d(16, 32, kernel_size=3, padding=1), # 64x64x32
            nn.ReLU(),
            nn.MaxPool2d(2),                              # 32x32x32

            nn.Conv2d(32, 64, kernel_size=3, padding=1), # 32x32x64
            nn.ReLU(),
            nn.MaxPool2d(2),                              # 16x16x64
        )

        # 计算CNN输出的维度
        cnn_out_size = 64 * (img_size // 8) * (img_size // 8)

        # MLP部分：把特征转成动作预测
        self.mlp = nn.Sequential(
            nn.Linear(cnn_out_size, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 5),   # 输出5个值：x, y, r, g, b
            nn.Sigmoid()        # 全部压到0~1范围
        )

    def forward(self, x):
        features = self.cnn(x)
        features = features.view(features.size(0), -1)  # 展平
        output = self.mlp(features)
        return output


# ==========================================
# 3. 训练循环
# ==========================================

def train(data_dir, epochs=50, batch_size=4, lr=0.001, img_size=128):
    print(f"\n{'='*50}")
    print(f"Training config:")
    print(f"  data_dir: {data_dir}")
    print(f"  epochs: {epochs}")
    print(f"  batch_size: {batch_size}")
    print(f"  img_size: {img_size}x{img_size}")
    print(f"{'='*50}\n")

    # 加载数据
    dataset = DrawingDataset(data_dir, img_size=img_size)

    if len(dataset) == 0:
        print("ERROR: No samples found! Check your data directory.")
        return

    # 数据太少时不做train/val split，全部用来训练
    if len(dataset) < 10:
        print(f"Warning: Only {len(dataset)} samples. Skipping validation split.")
        train_loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        val_loader = None
    else:
        # 8:2 分割训练集和验证集
        val_size = max(1, int(len(dataset) * 0.2))
        train_size = len(dataset) - val_size
        train_set, val_set = torch.utils.data.random_split(dataset, [train_size, val_size])
        train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_set, batch_size=batch_size)
        print(f"Train: {train_size} samples, Val: {val_size} samples\n")

    # 初始化模型
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}\n")

    model = DrawingModel(img_size=img_size).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    # 损失函数：MSE（预测值和真实值的均方误差）
    criterion = nn.MSELoss()

    best_val_loss = float('inf')

    for epoch in range(epochs):
        # 训练阶段
        model.train()
        train_loss = 0.0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            predictions = model(images)
            loss = criterion(predictions, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        train_loss /= len(train_loader)

        # 验证阶段
        if val_loader:
            model.eval()
            val_loss = 0.0
            with torch.no_grad():
                for images, labels in val_loader:
                    images = images.to(device)
                    labels = labels.to(device)
                    predictions = model(images)
                    val_loss += criterion(predictions, labels).item()
            val_loss /= len(val_loader)

            # 每10个epoch打印一次
            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{epochs}]  "
                      f"Train Loss: {train_loss:.4f}  "
                      f"Val Loss: {val_loss:.4f}")

            # 保存最好的模型
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                torch.save(model.state_dict(), 'best_model.pth')
        else:
            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{epochs}]  Train Loss: {train_loss:.4f}")

    print(f"\nTraining complete!")
    print(f"Model saved to: best_model.pth")

    # 导出为ONNX格式（给JS用）
    export_onnx(model, img_size, device)


def export_onnx(model, img_size, device):
    """导出模型为ONNX格式，供JS端的onnxruntime-web加载"""
    print("\nExporting to ONNX...")
    model.eval()

    # 加载最好的权重
    if os.path.exists('best_model.pth'):
        model.load_state_dict(torch.load('best_model.pth', map_location=device))

    dummy_input = torch.randn(1, 1, img_size, img_size).to(device)

    torch.onnx.export(
        model,
        dummy_input,
        'drawing_model.onnx',
        input_names=['canvas_image'],
        output_names=['next_action'],
        dynamic_axes={
            'canvas_image': {0: 'batch_size'},
            'next_action': {0: 'batch_size'}
        },
        opset_version=11
    )
    print("ONNX model saved to: drawing_model.onnx")
    print("\nOutput format: [x, y, r, g, b]")
    print("  x, y: normalized coordinates (0~1) of next stroke start")
    print("  r, g, b: normalized color values (0~1)")


# ==========================================
# 4. 入口
# ==========================================

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Drawing AI Model')
    parser.add_argument('--data_dir', type=str, required=True,
                        help='Path to session folder containing step_XXXX.png and .json files')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--batch_size', type=int, default=4)
    parser.add_argument('--lr', type=float, default=0.001)
    parser.add_argument('--img_size', type=int, default=128)
    args = parser.parse_args()

    train(
        data_dir=args.data_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        img_size=args.img_size
    )