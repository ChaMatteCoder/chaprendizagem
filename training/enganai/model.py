"""A small unconditional DCGAN with the approved NCHW/logit interfaces."""
import torch
from torch import nn


class Generator(nn.Module):
    def __init__(self, dimension=64, width=32):
        super().__init__()
        self.layers = nn.Sequential(
            nn.ConvTranspose2d(dimension, width * 2, 7, 1, 0, bias=False),
            nn.BatchNorm2d(width * 2), nn.ReLU(),
            nn.ConvTranspose2d(width * 2, width, 4, 2, 1, bias=False),
            nn.BatchNorm2d(width), nn.ReLU(),
            nn.ConvTranspose2d(width, 1, 4, 2, 1, bias=False), nn.Tanh(),
        )

    def forward(self, latent):
        return self.layers(latent)


class Discriminator(nn.Module):
    def __init__(self, width=16, normalization="batch"):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Conv2d(1, width, 4, 2, 1, bias=False), nn.LeakyReLU(0.2),
            nn.Conv2d(width, width * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(width * 2) if normalization == "batch" else nn.Identity(), nn.LeakyReLU(0.2),
            nn.Conv2d(width * 2, 1, 7, 1, 0, bias=False), nn.Flatten(1),
        )

    def forward(self, images):
        return self.layers(images)


def initialize(module):
    if isinstance(module, (nn.Conv2d, nn.ConvTranspose2d)):
        nn.init.normal_(module.weight, 0, 0.02)
    elif isinstance(module, nn.BatchNorm2d):
        nn.init.normal_(module.weight, 1, 0.02)
        nn.init.zeros_(module.bias)


def build_models(config):
    generator = Generator(config["latentDimension"], config["generatorWidth"])
    discriminator = Discriminator(config["discriminatorWidth"], config.get("discriminatorNormalization", "batch"))
    generator.apply(initialize)
    discriminator.apply(initialize)
    return generator, discriminator


def normalize(pixels):
    return torch.as_tensor(pixels.copy(), dtype=torch.float32).unsqueeze(1).div(127.5).sub(1)


def image_bytes(images):
    if images.ndim != 4 or tuple(images.shape[1:]) != (1, 28, 28) or not torch.isfinite(images).all():
        raise ValueError("Invalid generated image tensor")
    if images.min() < -1.000001 or images.max() > 1.000001:
        raise ValueError("Image outside the declared range")
    return images.detach().cpu().add(1).mul(127.5).round().clamp(0, 255).to(torch.uint8).squeeze(1).numpy()


def discriminator_step(generator, discriminator, real, latent, optimizer):
    generator.train()
    discriminator.train()
    optimizer.zero_grad(set_to_none=True)
    fake = generator(latent)
    criterion = nn.BCEWithLogitsLoss()
    real_logits, fake_logits = discriminator(real), discriminator(fake.detach())
    loss = criterion(real_logits, torch.ones_like(real_logits)) + criterion(fake_logits, torch.zeros_like(fake_logits))
    if not torch.isfinite(loss):
        raise FloatingPointError("Non-finite discriminator loss")
    loss.backward()
    optimizer.step()
    return fake, float(loss.detach())


def generator_step(discriminator, fake, optimizer):
    optimizer.zero_grad(set_to_none=True)
    # Freeze both weights and BatchNorm state while retaining dD/d(fake) for G.
    discriminator.eval()
    discriminator.requires_grad_(False)
    try:
        logits = discriminator(fake)
        loss = nn.functional.binary_cross_entropy_with_logits(logits, torch.ones_like(logits))
        if not torch.isfinite(loss):
            raise FloatingPointError("Non-finite generator loss")
        loss.backward()
        optimizer.step()
        return float(loss.detach())
    finally:
        discriminator.requires_grad_(True)
        discriminator.train()
