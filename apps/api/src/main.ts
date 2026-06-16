import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Raw body needed for Shopify/Stripe HMAC verification on /webhooks/*
    rawBody: true,
  });

  app.setGlobalPrefix("v1");
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
    credentials: true,
  });

  if (process.env.AUTH_DEV_BYPASS === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_DEV_BYPASS must never be enabled in production");
    }
    console.warn("⚠️  AUTH_DEV_BYPASS is ON — any credentials are accepted, no database required.");
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API listening on :${port} (prefix /v1)`);
}

void bootstrap();
