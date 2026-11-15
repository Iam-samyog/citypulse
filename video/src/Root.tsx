import {Composition} from 'remotion';
import {OracleOfIthaca, TOTAL_DURATION} from './OracleOfIthaca';

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
		</>
	);
};
