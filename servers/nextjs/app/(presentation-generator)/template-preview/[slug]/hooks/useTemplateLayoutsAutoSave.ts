'use client';

import { ProcessedSlide } from '@/app/(presentation-generator)/custom-template/types';
import { CustomTemplateLayout } from '@/app/hooks/useCustomTemplates';

interface UseTemplateLayoutsAutoSaveOptions {
    templateId: string | null;
    layouts: CustomTemplateLayout[];
    slideStates: ProcessedSlide[];
    debounceMs?: number;
    enabled?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Disabled no-op: hook kept only to satisfy imports without build errors.
export const useTemplateLayoutsAutoSave = ({
    templateId,
    layouts,
    slideStates,
    debounceMs = 2000,
    enabled = true,
}: UseTemplateLayoutsAutoSaveOptions) => {
    void templateId;
    void layouts;
    void slideStates;
    void debounceMs;
    void enabled;

    const saveStatus: SaveStatus = 'idle';
    const lastSavedAt: Date | null = null;
    const saveNow = async () => false;

    return {
        saveStatus,
        lastSavedAt,
        saveNow,
    };
};
