import {Composition} from 'remotion';
import {OracleOfIthaca, TOTAL_DURATION} from './OracleOfIthaca';
import {Thumbnail} from './Thumbnail';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="OracleOfIthaca"
				component={OracleOfIthaca}
				durationInFrames={TOTAL_DURATION}
				fps={30}
				width={1920}
				height={1080}
			/>
			<Composition
				id="Thumbnail"
				component={Thumbnail}
				durationInFrames={1}
				fps={30}
				width={1200}
				height={900}
			/>
		</>
	);
};
