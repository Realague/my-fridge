import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Boxes, ChevronDown, ChevronRight } from 'lucide-react';

import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import {
  MORE_SECTIONS,
  type MoreFeature,
  type MoreSection,
} from '@/config/moreNavigation';

const More = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);

  useProtectedRoute();

  const visibleSections = useMemo(
    () => MORE_SECTIONS.filter((section) => section.features.length > 0),
    [],
  );

  const handleFeatureClick = (feature: MoreFeature) => {
    if (feature.action === 'signOut') {
      signOut();
      navigate('/auth');
      return;
    }
    if (feature.to) {
      navigate(feature.to);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">
            {t('pages.more.title')}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {visibleSections.map((section) => (
          <MoreSectionBlock
            key={section.id}
            section={section}
            extra={section.id === 'stock' ? <StorageAreasRow /> : null}
            onFeatureClick={handleFeatureClick}
          />
        ))}
      </main>

      <BottomNavigation currentPage="more" />
    </div>
  );
};

interface MoreSectionBlockProps {
  section: MoreSection;
  extra?: ReactNode;
  onFeatureClick: (feature: MoreFeature) => void;
}

const MoreSectionBlock = ({ section, extra, onFeatureClick }: MoreSectionBlockProps) => {
  const { t } = useTranslation();
  return (
    <section aria-labelledby={`more-section-${section.id}`} className="space-y-3">
      <h2
        id={`more-section-${section.id}`}
        className="mf-eyebrow text-muted-foreground px-1"
      >
        {t(section.titleKey)}
      </h2>
      <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0 divide-y divide-border">
          {extra}
          {section.features.map((feature) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              onClick={() => onFeatureClick(feature)}
            />
          ))}
        </CardContent>
      </Card>
    </section>
  );
};

interface FeatureRowProps {
  feature: MoreFeature;
  onClick: () => void;
}

const FeatureRow = ({ feature, onClick }: FeatureRowProps) => {
  const { t } = useTranslation();
  const Icon = feature.icon;
  const title = t(feature.titleKey);
  const description = t(feature.descriptionKey);
  const isDestructive = feature.action === 'signOut';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title} — ${description}`}
      className={cn(
        'group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
        'hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          isDestructive
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex flex-1 flex-col min-w-0">
        <span
          className={cn(
            'font-medium truncate',
            isDestructive ? 'text-destructive' : 'text-foreground',
          )}
        >
          {title}
        </span>
        <span className="text-sm text-muted-foreground truncate">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
};

const StorageAreasRow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const selectedHouseholdId = useHouseholdStore((s) => s.selectedHouseholdId);
  const storageAreasByHousehold = useStorageAreaStore((s) => s.storageAreasByHousehold);
  const fetchStorageAreas = useStorageAreaStore((s) => s.fetchStorageAreas);

  const storageAreas = selectedHouseholdId
    ? storageAreasByHousehold[selectedHouseholdId] ?? []
    : [];

  // Lazy-fetch on first expand if the store hasn't been hydrated yet (the user
  // may have landed on /more without visiting Dashboard first).
  useEffect(() => {
    if (expanded && selectedHouseholdId && storageAreas.length === 0) {
      void fetchStorageAreas();
    }
  }, [expanded, selectedHouseholdId, storageAreas.length, fetchStorageAreas]);

  const title = t('pages.more.storageAreas.title');
  const description = t('pages.more.storageAreas.description');
  const emptyLabel = t('pages.more.storageAreas.empty');
  const panelId = 'more-storage-areas-panel';

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${title} — ${description}`}
        className={cn(
          'group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
          'hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Boxes className="h-5 w-5" />
        </span>
        <span className="flex flex-1 flex-col min-w-0">
          <span className="font-medium truncate text-foreground">{title}</span>
          <span className="text-sm text-muted-foreground truncate">{description}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div id={panelId} role="region" aria-label={title} className="bg-muted/40">
          {storageAreas.length === 0 ? (
            <p className="px-4 py-3 pl-[4.25rem] text-sm text-muted-foreground">
              {emptyLabel}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {storageAreas.map((area) => (
                <li key={area.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/storage/${area.id}`)}
                    aria-label={`${area.emoji ?? ''} ${area.name}`.trim()}
                    className={cn(
                      'group flex w-full items-center gap-3 px-4 py-2.5 pl-[4.25rem] text-left transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    )}
                  >
                    <span className="text-lg shrink-0" aria-hidden="true">
                      {area.emoji || '📦'}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {area.name}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default More;
