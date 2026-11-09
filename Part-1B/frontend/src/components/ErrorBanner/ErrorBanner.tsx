type ErrorBannerProps = {
  message: string;
};

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <p className="error-banner" role="alert">
      {message}
    </p>
  );
}
