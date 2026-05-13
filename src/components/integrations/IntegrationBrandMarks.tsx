import csvIconUrl from "@/assets/icons/csv-icon.png";
import docsIconUrl from "@/assets/icons/docs-icon.png";
import jiraIconUrl from "@/assets/icons/jira-icon.png";
import linearIconUrl from "@/assets/icons/linear-icon.png";
import notionIconUrl from "@/assets/icons/notion-icon.png";
import slackIconUrl from "@/assets/icons/slack-icon.png";

function BrandImg({ src, size = 28 }: { src: string; size?: number }) {
  return <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className="integration-brand-mark__img" />;
}

export function SlackBrandMark() {
  return <BrandImg src={slackIconUrl} />;
}

export function JiraBrandMark() {
  return <BrandImg src={jiraIconUrl} />;
}

export function LinearBrandMark() {
  return <BrandImg src={linearIconUrl} />;
}

export function CsvImportBrandMark() {
  return <BrandImg src={csvIconUrl} />;
}

export function CsvExportBrandMark() {
  return <BrandImg src={csvIconUrl} />;
}

export function NotionDocsBrandMark() {
  return (
    <>
      <div className="integration-brand-mark integration-brand-mark--compact">
        <BrandImg src={notionIconUrl} size={24} />
      </div>
      <div className="integration-brand-mark integration-brand-mark--compact">
        <BrandImg src={docsIconUrl} size={24} />
      </div>
    </>
  );
}
