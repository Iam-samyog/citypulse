import React from 'react';

export type IconKind = 'ai' | 'database' | 'voice' | 'cloud' | 'domain';

export const SponsorIcon: React.FC<{kind: IconKind; color: string; size?: number}> = ({
	kind,
	color,
	size = 64,
}) => {
	const common = {
		width: size,
		height: size,
		viewBox: '0 0 48 48',
		fill: 'none',
		stroke: color,
		strokeWidth: 2.2,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
	};

	switch (kind) {
		case 'ai':
			return (
				<svg {...common}>
					<path d="M24 6 L28 20 L42 24 L28 28 L24 42 L20 28 L6 24 L20 20 Z" />
					<circle cx="24" cy="24" r="3.4" fill={color} stroke="none" />
				</svg>
			);
		case 'database':
			return (
				<svg {...common}>
					<ellipse cx="24" cy="10" rx="16" ry="6" />
					<path d="M8 10 V24 C8 27.3 15.2 30 24 30 C32.8 30 40 27.3 40 24 V10" />
					<path d="M8 24 V38 C8 41.3 15.2 44 24 44 C32.8 44 40 41.3 40 38 V24" />
				</svg>
			);
		case 'voice':
			return (
				<svg {...common}>
					<rect x="8" y="20" width="4" height="8" rx="2" />
					<rect x="16" y="13" width="4" height="22" rx="2" />
					<rect x="24" y="6" width="4" height="36" rx="2" />
					<rect x="32" y="13" width="4" height="22" rx="2" />
					<rect x="40" y="20" width="4" height="8" rx="2" />
				</svg>
			);
		case 'cloud':
			return (
				<svg {...common}>
					<path d="M15 33 C9 33 5 29.2 5 24.5 C5 20.2 8.3 16.7 12.6 16.2 C14 11 18.6 7 24 7 C30.1 7 35.1 11.7 35.8 17.7 C40.4 18.4 44 22.3 44 27 C44 32 40 36 35 36 L15 36 Z" />
				</svg>
			);
		case 'domain':
			return (
				<svg {...common}>
					<circle cx="24" cy="24" r="18" />
					<path d="M6 24 H42" />
					<path d="M24 6 C30 12 33 18 33 24 C33 30 30 36 24 42 C18 36 15 30 15 24 C15 18 18 12 24 6 Z" />
				</svg>
			);
		default:
			return null;
	}
};
