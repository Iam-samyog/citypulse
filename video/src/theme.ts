import {loadFont as loadDisplayFont} from '@remotion/google-fonts/Cinzel';
import {loadFont as loadBodyFont} from '@remotion/google-fonts/CormorantGaramond';
import {loadFont as loadUiFont} from '@remotion/google-fonts/Inter';

export const {fontFamily: displayFont} = loadDisplayFont('normal', {weights: ['400', '600']});
export const {fontFamily: bodyFont} = loadBodyFont('normal', {weights: ['400', '500', '600']});
export const {fontFamily: uiFont} = loadUiFont('normal', {weights: ['400', '500', '600', '700']});

export const colors = {
	bgDark: '#1a0e0a',
	maroon: '#3a0f12',
	maroonDeep: '#260a0c',
	bronze: '#c99a4b',
	bronzeLight: '#e8c983',
	parchment: '#f1e3c6',
	parchmentDim: '#cbb98f',
	ember: '#e2651b',
};
